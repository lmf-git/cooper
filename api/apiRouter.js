import { Router } from "express";
import AuthRouter from "./auth/authRouter";
import BasesRouter from "./services/bases/basesRouter";
import GroundRouter from "./services/conquest/groundRouter";

const APIRouter = Router();


APIRouter.get('/', (req, res) => res.status(200).send(200));
APIRouter.use('/auth', AuthRouter);

// APIRouter.use('/conquest', BasesRouter);
    APIRouter.use('/bases', BasesRouter);
    APIRouter.use('/ground', GroundRouter);

export default APIRouter;
