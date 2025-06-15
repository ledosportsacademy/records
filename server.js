const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ledosportsacademy:KYbsTxWjVBvPnREP@ledosportsacademy.ejcd06z.mongodb.net/?retryWrites=true&w=majority&appName=ledosportsacademy';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1); // Exit if we can't connect to database
    });

// Models
const memberSchema = new mongoose.Schema({
    id: { 
        type: Number,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    address: String,
    joinDate: {
        type: String,
        required: true
    },
    photoUrl: String,
    payments: [{
        date: {
            type: String,
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        week: {
            type: String,
            required: true
        }
    }]
});

const expenseSchema = new mongoose.Schema({
    id: Number,
    date: String,
    amount: Number,
    category: String,
    description: String
});

const donationSchema = new mongoose.Schema({
    id: Number,
    date: String,
    amount: Number,
    donor: String,
    purpose: String
});

const Member = mongoose.model('Member', memberSchema);
const Expense = mongoose.model('Expense', expenseSchema);
const Donation = mongoose.model('Donation', donationSchema);

// API Routes
const apiRouter = express.Router();

// Members
apiRouter.get('/members', async (req, res) => {
    try {
        const members = await Member.find();
        res.json(members);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/members', async (req, res) => {
    try {
        console.log('Received member data:', req.body);
        
        // Validate required fields
        if (!req.body.name || !req.body.phone) {
            return res.status(400).json({ error: 'Name and phone are required fields' });
        }

        // Generate new ID
        const lastMember = await Member.findOne().sort({ id: -1 });
        const newId = lastMember ? lastMember.id + 1 : 1;
        
        const memberData = {
            ...req.body,
            id: newId,
            payments: req.body.payments || []
        };

        const member = new Member(memberData);
        const savedMember = await member.save();
        console.log('Member saved successfully:', savedMember);
        res.status(201).json(savedMember);
    } catch (err) {
        console.error('Error saving member:', err);
        if (err.code === 11000) {
            res.status(400).json({ error: 'Duplicate member ID found' });
        } else {
            res.status(400).json({ error: err.message });
        }
    }
});

apiRouter.put('/members/:id', async (req, res) => {
    try {
        const member = await Member.findOneAndUpdate(
            { id: req.params.id },
            req.body,
            { new: true }
        );
        res.json(member);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

apiRouter.delete('/members/:id', async (req, res) => {
    try {
        await Member.findOneAndDelete({ id: req.params.id });
        res.status(204).send();
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Expenses
apiRouter.get('/expenses', async (req, res) => {
    try {
        const expenses = await Expense.find();
        res.json(expenses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/expenses', async (req, res) => {
    try {
        const expense = new Expense(req.body);
        await expense.save();
        res.status(201).json(expense);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

apiRouter.delete('/expenses/:id', async (req, res) => {
    try {
        await Expense.findOneAndDelete({ id: req.params.id });
        res.status(204).send();
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Donations
apiRouter.get('/donations', async (req, res) => {
    try {
        const donations = await Donation.find();
        res.json(donations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/donations', async (req, res) => {
    try {
        const donation = new Donation(req.body);
        await donation.save();
        res.status(201).json(donation);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

apiRouter.delete('/donations/:id', async (req, res) => {
    try {
        await Donation.findOneAndDelete({ id: req.params.id });
        res.status(204).send();
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Mount API routes
app.use('/api', apiRouter);

// Serve static files for any other route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 