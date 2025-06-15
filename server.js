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

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// MongoDB Connection with retry logic
const connectWithRetry = async () => {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ledosportsacademy:KYbsTxWjVBvPnREP@ledosportsacademy.ejcd06z.mongodb.net/?retryWrites=true&w=majority&appName=ledosportsacademy';
    
    try {
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s
        });
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        console.log('Retrying connection in 5 seconds...');
        setTimeout(connectWithRetry, 5000);
    }
};

connectWithRetry();

// Handle MongoDB connection errors
mongoose.connection.on('error', err => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected. Attempting to reconnect...');
    connectWithRetry();
});

// Models
const memberSchema = new mongoose.Schema({
    id: { 
        type: Number,
        required: true,
        unique: true,
        validate: {
            validator: Number.isInteger,
            message: '{VALUE} is not a valid member ID'
        }
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    joinDate: {
        type: String,
        required: true
    },
    photoUrl: {
        type: String,
        trim: true
    },
    payments: [{
        date: {
            type: String,
            required: true
        },
        amount: {
            type: Number,
            required: true,
            min: [0, 'Payment amount cannot be negative']
        },
        week: {
            type: String,
            required: true
        }
    }]
});

// Add pre-save middleware to ensure ID is valid
memberSchema.pre('save', async function(next) {
    if (this.isNew) {
        try {
            const lastMember = await this.constructor.findOne().sort({ id: -1 });
            this.id = lastMember ? lastMember.id + 1 : 1;
        } catch (error) {
            return next(error);
        }
    }
    next();
});

// Add pre-validate middleware to ensure ID is a valid number
memberSchema.pre('validate', function(next) {
    if (this.isModified('id')) {
        if (typeof this.id !== 'number' || isNaN(this.id) || !Number.isInteger(this.id)) {
            next(new Error('Member ID must be a valid integer'));
            return;
        }
    }
    next();
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
        const memberData = {
            name: req.body.name.trim(),
            phone: req.body.phone.trim(),
            address: req.body.address ? req.body.address.trim() : '',
            photoUrl: req.body.photoUrl ? req.body.photoUrl.trim() : null,
            joinDate: req.body.joinDate || new Date().toISOString().split('T')[0],
            payments: req.body.payments || []
        };

        const member = new Member(memberData);
        await member.validate();
        const savedMember = await member.save();
        
        console.log(`New member created with ID: ${savedMember.id}`);
        res.status(201).json(savedMember);
    } catch (err) {
        console.error('Error creating member:', err);
        res.status(400).json({ error: err.message || 'Failed to create member' });
    }
});

apiRouter.put('/members/:id', async (req, res) => {
    try {
        const memberId = parseInt(req.params.id);
        
        if (isNaN(memberId)) {
            return res.status(400).json({ error: 'Invalid member ID' });
        }

        // Find the existing member
        const existingMember = await Member.findOne({ id: memberId });
        
        if (!existingMember) {
            return res.status(404).json({ error: 'Member not found' });
        }

        // Validate required fields
        if (!req.body.name || !req.body.phone) {
            return res.status(400).json({ error: 'Name and phone are required fields' });
        }

        // Prepare update data
        const updateData = {
            name: req.body.name.trim(),
            phone: req.body.phone.trim(),
            address: req.body.address ? req.body.address.trim() : '',
            photoUrl: req.body.photoUrl ? req.body.photoUrl.trim() : null,
            payments: existingMember.payments // Preserve existing payments
        };

        // Update member data
        const updatedMember = await Member.findOneAndUpdate(
            { id: memberId },
            updateData,
            { 
                new: true,
                runValidators: true
            }
        );

        if (!updatedMember) {
            return res.status(404).json({ error: 'Member not found' });
        }

        console.log(`Member updated successfully: ID ${memberId}`);
        res.json(updatedMember);
    } catch (err) {
        console.error('Error updating member:', err);
        res.status(400).json({ error: err.message || 'Failed to update member' });
    }
});

apiRouter.delete('/members/:id', async (req, res) => {
    try {
        const memberId = parseInt(req.params.id);
        
        if (isNaN(memberId)) {
            return res.status(400).json({ error: 'Invalid member ID' });
        }

        const deletedMember = await Member.findOneAndDelete({ id: memberId });
        
        if (!deletedMember) {
            return res.status(404).json({ error: 'Member not found' });
        }

        console.log(`Member deleted successfully: ID ${memberId}`);
        res.json({ message: 'Member deleted successfully' });
    } catch (err) {
        console.error('Error deleting member:', err);
        res.status(500).json({ error: err.message || 'Failed to delete member' });
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

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

// Handle server shutdown gracefully
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed. Disconnecting from MongoDB...');
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed.');
            process.exit(0);
        });
    });
});

// Keep the process running
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
}); 
