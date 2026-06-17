import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import {
  buildTargetsResponse,
  upsertTodayRoomStats,
  updateAllTargets
} from '../services/deadlines.js';
import {
  parsePeriod,
  formatPeriod,
  isAssignmentActive,
  isCurrentOrNextCheckMonth,
  purgeExpiredMonthChecks
} from '../services/monthChecks.js';
import { clientOffset, getLocalParts, dateFromParts, endOfLocalMonth } from '../lib/timezone.js';

const router = Router();

router.get('/month-products', async (req, res) => {
  try {
    const offset = clientOffset(req);  // ← ДОБАВЛЕНО
    await purgeExpiredMonthChecks(prisma, offset);
    const now = new Date();
    const items = await prisma.productMonthCheck.findMany({
      include: { product: true },
      orderBy: { product: { name: 'asc' } }
    });

    const active = items.filter(i =>
      isAssignmentActive(i.checkMonth, i.checkYear, now, offset) &&
      isCurrentOrNextCheckMonth(i.checkMonth, i.checkYear, now, offset)
    );

    res.json(active.map(i => ({
      id: i.id,
      productId: i.productId,
      checkMonth: i.checkMonth,
      checkYear: i.checkYear,
      period: formatPeriod(i.checkMonth, i.checkYear),
      product: i.product
    })));
  } catch (err) {
    console.error('GET deadlines/month-products error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/month-products/manage', async (req, res) => {
  try {
    const offset = clientOffset(req);
    await purgeExpiredMonthChecks(prisma, offset);
    const [products, checks] = await Promise.all([
      prisma.product.findMany({
        where: { hasExpiry: true },
        orderBy: { name: 'asc' }
      }),
      prisma.productMonthCheck.findMany({ orderBy: [{ checkYear: 'asc' }, { checkMonth: 'asc' }] })
    ]);

    const checksByProduct = {};
    checks.forEach(c => {
      if (!isAssignmentActive(c.checkMonth, c.checkYear, new Date(), offset)) return;
      if (!checksByProduct[c.productId]) checksByProduct[c.productId] = [];
      checksByProduct[c.productId].push({
        id: c.id,
        checkMonth: c.checkMonth,
        checkYear: c.checkYear,
        period: formatPeriod(c.checkMonth, c.checkYear)
      });
    });

    res.json(products.map(p => ({
      ...p,
      monthChecks: checksByProduct[p.id] || []
    })));
  } catch (err) {
    console.error('GET deadlines/month-products/manage error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/month-products/:productId', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    const checkId = req.body.checkId ? parseInt(req.body.checkId, 10) : null;
    const parsed = parsePeriod(req.body.period);
    if (!parsed) {
      return res.status(400).json({ error: 'Укажите период в формате MM.YY (например 11.26)' });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Продукт не найден' });

    if (checkId) {
      const existing = await prisma.productMonthCheck.findFirst({
        where: { id: checkId, productId }
      });
      if (!existing) return res.status(404).json({ error: 'Запись не найдена' });

      const duplicate = await prisma.productMonthCheck.findFirst({
        where: {
          productId,
          checkMonth: parsed.month,
          checkYear: parsed.year,
          NOT: { id: checkId }
        }
      });
      if (duplicate) {
        return res.status(409).json({ error: 'Такой период уже добавлен для этого продукта' });
      }

      const result = await prisma.productMonthCheck.update({
        where: { id: checkId },
        data: { checkMonth: parsed.month, checkYear: parsed.year },
        include: { product: true }
      });

      return res.json({
        ...result,
        period: formatPeriod(result.checkMonth, result.checkYear)
      });
    }

    const duplicate = await prisma.productMonthCheck.findFirst({
      where: {
        productId,
        checkMonth: parsed.month,
        checkYear: parsed.year
      }
    });
    if (duplicate) {
      return res.status(409).json({ error: 'Такой период уже добавлен для этого продукта' });
    }

    const result = await prisma.productMonthCheck.create({
      data: { productId, checkMonth: parsed.month, checkYear: parsed.year },
      include: { product: true }
    });

    res.json({
      ...result,
      period: formatPeriod(result.checkMonth, result.checkYear)
    });
  } catch (err) {
    console.error('PUT deadlines/month-products error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/month-products/check/:checkId', async (req, res) => {
  try {
    const checkId = parseInt(req.params.checkId, 10);
    await prisma.productMonthCheck.deleteMany({ where: { id: checkId } });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE deadlines/month-products/check error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/month-products/:productId', async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    await prisma.productMonthCheck.deleteMany({ where: { productId } });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE deadlines/month-products error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/replacement-summary', async (req, res) => {
  try {
    const rows = await prisma.roomProductStatus.findMany({
      where: { qtyToReplace: { gt: 0 } },
      include: { product: true }
    });

    const byProduct = {};
    rows.forEach(row => {
      if (!byProduct[row.productId]) {
        byProduct[row.productId] = {
          productId: row.productId,
          product: row.product,
          totalQty: 0
        };
      }
      byProduct[row.productId].totalQty += row.qtyToReplace;
    });

    const items = Object.values(byProduct).sort((a, b) =>
      a.product.name.localeCompare(b.product.name, 'ru')
    );

    res.json({ items, totalQty: items.reduce((s, i) => s + i.totalQty, 0) });
  } catch (err) {
    console.error('GET deadlines/replacement-summary error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/targets', async (req, res) => {
  try {
    const offset = clientOffset(req);
    const result = await prisma.$transaction(tx => buildTargetsResponse(tx, offset));
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });
    res.json(result);
  } catch (err) {
    console.error('GET deadlines/targets error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const offset = clientOffset(req);
    const now = new Date();
    const parts = getLocalParts(now, offset);
    const currentMonthStart = dateFromParts({ year: parts.year, month: parts.month, day: 1 });
    const prevMonth = parts.month === 1 ? 12 : parts.month - 1;
    const prevYear = parts.month === 1 ? parts.year - 1 : parts.year;
    const prevMonthStart = dateFromParts({ year: prevYear, month: prevMonth, day: 1 });
    const prevMonthEnd = endOfLocalMonth(prevMonthStart, offset);

    const [currentStats, prevStats] = await Promise.all([
      prisma.deadlineDailyStat.findMany({
        where: { date: { gte: currentMonthStart } },
        orderBy: { date: 'asc' }
      }),
      prisma.deadlineDailyStat.findMany({
        where: { date: { gte: prevMonthStart, lte: prevMonthEnd } },
        orderBy: { date: 'asc' }
      })
    ]);

    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });

    res.json({
      current: currentStats,
      previous: prevStats,
      currentMonth: parts.month,
      currentYear: parts.year
    });
  } catch (err) {
    console.error('GET deadlines/stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/update-stats', async (req, res) => {
  try {
    const offset = clientOffset(req);
    const result = await prisma.$transaction(tx => upsertTodayRoomStats(tx, offset));
    res.json(result);
  } catch (err) {
    console.error('POST deadlines/update-stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;