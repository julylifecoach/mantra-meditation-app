const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// GET /api/planner-tasks — fetch all tasks for the logged-in user
router.get('/', async (req, res) => {
  try {
    const tasks = await prisma.plannerTask.findMany({
      where: { userId: req.userId },
      orderBy: [{ done: 'asc' }, { priority: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    res.json(tasks);
  } catch (err) {
    console.error('Failed to fetch planner tasks:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// PUT /api/planner-tasks/sync — bulk sync (replace all tasks for user)
router.put('/sync', async (req, res) => {
  try {
    const { tasks } = req.body;
    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: 'tasks must be an array' });
    }

    // Delete all existing tasks for this user
    await prisma.plannerTask.deleteMany({ where: { userId: req.userId } });

    // Insert all incoming tasks
    if (tasks.length > 0) {
      const data = tasks.map((t, i) => ({
        id: t.id || undefined,
        userId: req.userId,
        title: t.title || 'Untitled',
        category: t.category || null,
        priority: typeof t.priority === 'number' ? t.priority : 2,
        storyPoints: typeof t.storyPoints === 'number' ? t.storyPoints : 0,
        done: !!t.done,
        sortOrder: i,
      }));

      await prisma.plannerTask.createMany({ data });
    }

    const updated = await prisma.plannerTask.findMany({
      where: { userId: req.userId },
      orderBy: [{ done: 'asc' }, { priority: 'desc' }, { sortOrder: 'asc' }],
    });

    res.json(updated);
  } catch (err) {
    console.error('Failed to sync planner tasks:', err);
    res.status(500).json({ error: 'Failed to sync tasks' });
  }
});

// POST /api/planner-tasks — create a single task
router.post('/', async (req, res) => {
  try {
    const { title, category, priority, storyPoints } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Title required' });

    const task = await prisma.plannerTask.create({
      data: {
        userId: req.userId,
        title: title.trim(),
        category: category || null,
        priority: typeof priority === 'number' ? priority : 2,
        storyPoints: typeof storyPoints === 'number' ? storyPoints : 0,
      },
    });
    res.json(task);
  } catch (err) {
    console.error('Failed to create planner task:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PATCH /api/planner-tasks/:id — update a task (toggle done, change priority, etc.)
router.patch('/:id', async (req, res) => {
  try {
    const existing = await prisma.plannerTask.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    const allowed = ['title', 'category', 'priority', 'storyPoints', 'done', 'sortOrder'];
    const updates = {};
    allowed.forEach(key => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    const task = await prisma.plannerTask.update({
      where: { id: req.params.id },
      data: updates,
    });
    res.json(task);
  } catch (err) {
    console.error('Failed to update planner task:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/planner-tasks/:id — delete a task
router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.plannerTask.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Task not found' });

    await prisma.plannerTask.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete planner task:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
