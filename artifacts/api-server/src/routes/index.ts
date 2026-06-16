import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import projectsRouter from "./projects";
import assetsRouter from "./assets";
import colorsRouter from "./colors";
import aiJobsRouter from "./aiJobs";
import mockupsRouter from "./mockups";
import printJobsRouter from "./printJobs";
import techPacksRouter from "./techPacks";
import manufacturingRouter from "./manufacturing";
import collectionsRouter from "./collections";
import vectorizeRouter from "./vectorize";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(projectsRouter);
router.use(assetsRouter);
router.use(colorsRouter);
router.use(aiJobsRouter);
router.use(mockupsRouter);
router.use(printJobsRouter);
router.use(techPacksRouter);
router.use(manufacturingRouter);
router.use(collectionsRouter);
router.use(vectorizeRouter);

export default router;
