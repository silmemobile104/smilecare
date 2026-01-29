require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('MongoDB connection error:', err));

// Mongoose Schema
const WarrantySchema = new mongoose.Schema({
    memberId: { type: String, unique: true, index: true },
    staffName: String,
    customer: {
        firstName: String,
        lastName: String,
        phone: String,
        dob: Date,
        age: Number,
        address: String
    },
    device: {
        type: { type: String }, // 'type' is a reserved keyword in some contexts, but works in nested objects
        model: String,
        color: String,
        capacity: String,
        serial: String,
        imei: String,
        deviceValue: Number,
        officialWarrantyEnd: Date
    },
    package: {
        plan: String,
        price: Number
    },
    warrantyDates: {
        start: Date,
        end: Date
    },
    payment: {
        method: String,
        status: { type: String, default: 'Pending' },
        paidDate: Date,
        schedule: [{
            installmentNo: Number,
            amount: Number,
            dueDate: Date,
            graceDate: Date,
            status: { type: String, default: 'Pending' },
            paidDate: Date
        }]
    }
}, { timestamps: true });

const Warranty = mongoose.model('Warranty', WarrantySchema);

// Staff Schema
const StaffSchema = new mongoose.Schema({
    staffId: { type: String, unique: true },
    staffName: String,
    username: { type: String, unique: true, index: true },
    password: { type: String, required: true }
}, { timestamps: true });

const Staff = mongoose.model('Staff', StaffSchema);

// API Routes

// Staff Registration
app.post('/api/register', async (req, res) => {
    try {
        const { staffName, username, password } = req.body;

        // Check if username exists
        const existingStaff = await Staff.findOne({ username });
        if (existingStaff) {
            return res.status(400).json({ success: false, message: 'Username already exists' });
        }

        const staffId = 'STF' + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const newStaff = new Staff({ staffId, staffName, username, password });
        await newStaff.save();

        res.status(201).json({ success: true, user: { staffName, staffId } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Login (Database-backed)
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find staff in database
        const staff = await Staff.findOne({ username, password });

        if (staff) {
            res.json({
                success: true,
                user: { staffName: staff.staffName, staffId: staff.staffId }
            });
        } else {
            // Fallback for admin if no staff exists yet (optional, but keep for convenience as per requirement)
            if (username === 'admin' && password === '1234') {
                return res.json({
                    success: true,
                    user: { staffName: 'Admin', staffId: 'STF000' }
                });
            }
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get all warranties
app.get('/api/warranties', async (req, res) => {
    try {
        const warranties = await Warranty.find().sort({ createdAt: -1 });
        res.json(warranties);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create new warranty
app.post('/api/warranties', async (req, res) => {
    try {
        const { memberId, device } = req.body;

        // Server-side validation
        const existingId = await Warranty.findOne({ memberId });
        if (existingId) return res.status(400).json({ message: 'Member ID already exists' });

        const existingSerial = await Warranty.findOne({ 'device.serial': device.serial });
        if (existingSerial) return res.status(400).json({ message: 'Serial Number already registered' });

        const newWarranty = new Warranty(req.body);
        await newWarranty.save();
        res.status(201).json(newWarranty);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get single warranty
app.get('/api/warranties/:id', async (req, res) => {
    try {
        const warranty = await Warranty.findById(req.params.id);
        if (!warranty) return res.status(404).json({ message: 'Record not found' });
        res.json(warranty);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update warranty
app.put('/api/warranties/:id', async (req, res) => {
    try {
        const { memberId, ...updateData } = req.body;
        // memberId is immutable as per requirement

        const updated = await Warranty.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updated) return res.status(404).json({ message: 'Record not found' });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update Payment Status
app.patch('/api/warranties/:id/payment', async (req, res) => {
    try {
        const { installmentNo } = req.body;
        const warranty = await Warranty.findById(req.params.id);
        if (!warranty) return res.status(404).json({ message: 'Record not found' });

        if (installmentNo) {
            // Update specific installment
            const inst = warranty.payment.schedule.find(s => s.installmentNo === installmentNo);
            if (inst) {
                inst.status = 'Paid';
                inst.paidDate = new Date();
            }
        } else {
            // Update full payment
            warranty.payment.status = 'Paid';
            warranty.payment.paidDate = new Date();
        }

        await warranty.save();
        res.json({ success: true, warranty });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Serve frontend SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
