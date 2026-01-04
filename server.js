const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'form')));
app.use(express.static(__dirname));

// XML file path
const XML_FILE = path.join(__dirname, 'customers.xml');

// Initialize XML file if it doesn't exist
function initializeXMLFile() {
    if (!fs.existsSync(XML_FILE)) {
        const initialXML = `<?xml version="1.0" encoding="UTF-8"?>
<customers>
</customers>`;
        fs.writeFileSync(XML_FILE, initialXML, 'utf8');
    }
}

// Read customers from XML file
function readCustomersFromXML() {
    const xmlContent = fs.readFileSync(XML_FILE, 'utf8');
    // Simple XML parsing (in production, use a proper XML parser)
    const customerRegex = /<customer>([\s\S]*?)<\/customer>/g;
    const customers = [];
    let match;
    
    while ((match = customerRegex.exec(xmlContent)) !== null) {
        const customerXML = match[1];
        const customer = {
            id: parseInt(customerXML.match(/<id>(\d+)<\/id>/)[1]),
            name: customerXML.match(/<name>(.*?)<\/name>/)[1],
            surname: customerXML.match(/<surname>(.*?)<\/surname>/)[1],
            email: customerXML.match(/<email>(.*?)<\/email>/)[1],
            newsletter: customerXML.match(/<newsletter>(.*?)<\/newsletter>/)[1] === 'true',
            timestamp: customerXML.match(/<timestamp>(.*?)<\/timestamp>/)[1]
        };
        customers.push(customer);
    }
    
    return customers;
}

// Write customer to XML file
function writeCustomerToXML(customer) {
    const xmlContent = fs.readFileSync(XML_FILE, 'utf8');
    const customerXML = `    <customer>
        <id>${customer.id}</id>
        <name>${customer.name}</name>
        <surname>${customer.surname}</surname>
        <email>${customer.email}</email>
        <newsletter>${customer.newsletter}</newsletter>
        <timestamp>${customer.timestamp}</timestamp>
    </customer>`;
    
    const updatedXML = xmlContent.replace('</customers>', customerXML + '\n</customers>');
    fs.writeFileSync(XML_FILE, updatedXML, 'utf8');
}

// Serve the login page
app.get('/', (req, res) => {
    res.sendFile('auth.html', { root: __dirname });
});

// Handle form submission
app.post('/api/customers', (req, res) => {
    const { name, surname, email, newsletter } = req.body;
    
    // Validate required fields
    if (!name || !surname || !email) {
        return res.status(400).json({ 
            error: 'Name, surname, and email are required' 
        });
    }
    
    // Get current customers to determine next ID
    const customers = readCustomersFromXML();
    
    // Create customer object
    const customer = {
        id: customers.length > 0 ? Math.max(...customers.map(c => c.id)) + 1 : 1,
        name,
        surname,
        email,
        newsletter: newsletter || false,
        timestamp: new Date().toISOString()
    };
    
    // Write customer to XML file
    writeCustomerToXML(customer);
    
    console.log('New customer registered:', customer);
    
    res.status(201).json({ 
        message: 'Customer registered successfully',
        customer 
    });
});

// Get all customers
app.get('/api/customers', (req, res) => {
    const customers = readCustomersFromXML();
    res.json(customers);
});

// View XML file
app.get('/customers.xml', (req, res) => {
    res.sendFile(XML_FILE);
});

// Start server
app.listen(PORT, () => {
    // Initialize XML file
    initializeXMLFile();
    
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Form available at http://localhost:${PORT}/`);
    console.log(`API endpoint: http://localhost:${PORT}/api/customers`);
    console.log(`XML file available at http://localhost:${PORT}/customers.xml`);
});