import {Router} from 'express';
import { authenticateToken } from '../db/auth.ts';

const router = Router();


router.use(authenticateToken)
router.get('/', (req, res) => {
    // Handle login logic here
    res.json({ message: 'users' });
});

router.get('/:id', (req, res) => {
    // Handle registration logic here
    res.json({ message: 'got one user' })
});

router.put('/:id', (req, res) => {
    // Handle registration logic here
    res.json({ message: 'updated a user' })
});

router.delete('/:id', (req, res) => {
    // Handle registration logic here
    res.json({ message: 'deleted a user' })
});



export default router;