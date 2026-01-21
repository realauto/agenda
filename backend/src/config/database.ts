export const databaseConfig = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/projectlog',
  options: {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  },
};
