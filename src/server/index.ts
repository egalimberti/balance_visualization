import express, { Request, Response, NextFunction } from 'express';
import { PORT } from './config/constants';
import { graphRouter } from './routes';

const app = express();
app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    next();
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static('dist/webapp'));
app.use('/graphs', graphRouter);

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
