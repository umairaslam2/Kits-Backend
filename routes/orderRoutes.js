import express from 'express';
import { getTradeHistory, getLastTrade } from '../controller/orderController.js';

const router = express.Router();

router.get('/trade-history', getTradeHistory);
router.post('/last-trade', getLastTrade);

export default router;