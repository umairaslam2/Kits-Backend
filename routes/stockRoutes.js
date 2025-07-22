import express from 'express';
import poolPromise from '../database.js';
import { getStockData } from '../controller/stockController.js';

const router = express.Router();

router.post('/stock-data', getStockData);

export default router;