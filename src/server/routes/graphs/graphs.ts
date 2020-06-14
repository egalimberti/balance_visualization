import express, { Request, Response } from 'express';
import { graphController } from '../../controllers';

export const graphRouter = express.Router({
    strict: true
});

graphRouter.post('/', (req: Request, res: Response) => {
    graphController.create(req, res);
});

graphRouter.get('/', (req: Request, res: Response) => {
    graphController.read(req, res);
});

graphRouter.patch('/', (req: Request, res: Response) => {
    graphController.update(req, res);
});

graphRouter.put('/', (req: Request, res: Response) => {
    graphController.update(req, res);
});

graphRouter.delete('/', (req: Request, res: Response) => {
    graphController.delete(req, res);
});
