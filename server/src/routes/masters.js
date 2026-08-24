import { Router } from "express";
import { prisma } from "../db.js";
import { wrap } from "../middleware/error.js";

const r = Router();
r.get("/fishes",  wrap(async (_q, res) => res.json({ data: await prisma.fish.findMany({ orderBy: { id: "asc" } }) })));
r.get("/methods", wrap(async (_q, res) => res.json({ data: await prisma.method.findMany({ orderBy: { id: "asc" } }) })));
export default r;
