const app = require('./src/app');
const prisma = require('./src/prisma');

const connectDB = async () => {
    try {
        await prisma.$connect();
        console.log('MongoDB Atlas connected via Prisma');
    } catch (err) {
        console.log('⚠️ Database connection skipped/failed. Ensure you have a valid DATABASE_URL in your .env file.');
        // We catch the error so it doesn't print a huge stack trace
    }
}

connectDB().then(() => {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
