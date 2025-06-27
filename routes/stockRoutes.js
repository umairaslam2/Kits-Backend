import express from 'express';
import { getStockData } from '../controller/stockController.js';

const router = express.Router();

router.post('/stock-data', getStockData);

export default router;