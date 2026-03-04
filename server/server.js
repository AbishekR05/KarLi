const app = require('./src/app');

// mock db connect for initial test
const connectDB = async () => {
    console.log('MongoDB Atlas connection simulated');
}

connectDB().then(() => {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
    console.error(err);
    process.exit(1);
});
