import { Hono } from 'hono';
import * as v from 'valibot';
import { ApiWordLettuceBindings } from '../util/env';

const identitiesController = new Hono<{ Bindings: ApiWordLettuceBindings }>();