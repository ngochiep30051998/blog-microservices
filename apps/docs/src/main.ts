// main.ts
import { NestFactory } from '@nestjs/core';
import { Module, Controller, Get } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import fetch from 'node-fetch';

type OpenAPI = any;

async function fetchOpenApi(url: string): Promise<OpenAPI> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${url}: ${res.status}`);
  return res.json();
}

function mergeOpenApi(docs: OpenAPI[]): OpenAPI {
  const base: OpenAPI = {
    openapi: docs[0].openapi || '3.0.3',
    info: { title: 'Aggregated APIs', version: '1.0.0' },
    servers: [{ url: 'http://localhost:9000' }],
    tags: [],
    paths: {},
    components: {},
  };

  for (const doc of docs) {
    // Skip merging servers to keep only the base server (localhost:9000)
    // tags
    if (Array.isArray(doc.tags)) {
      const existing = new Set(base.tags.map((t: any) => t.name));
      for (const t of doc.tags) {
        if (!existing.has(t.name)) base.tags.push(t);
      }
    }
    // paths
    if (doc.paths) {
      for (const [p, val] of Object.entries(doc.paths)) {
        if (!base.paths[p]) base.paths[p] = {};
        Object.assign(base.paths[p], val);
      }
    }
    // components
    if (doc.components) {
      base.components = base.components || {};
      for (const [k, section] of Object.entries(doc.components)) {
        base.components[k] = base.components[k] || {};
        Object.assign(base.components[k], section);
      }
    }
  }
  return base;
}

let aggregatedDoc: OpenAPI;

@Controller()
class DocsController {
  @Get('swagger/json')
  getJson() {
    return aggregatedDoc;
  }
}

@Module({ controllers: [DocsController] })
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Fetch hai service
  const res = await Promise.allSettled([
    fetchOpenApi('http://localhost:9001/docs-json'),
    fetchOpenApi('http://localhost:9002/docs-json'),
  ]).then(results => results.filter(result => result.status === 'fulfilled')).then(results => results.map((result: any) => result.value));

  aggregatedDoc = mergeOpenApi(res);


  // Dùng documentFactory dạng “placeholder”; UI sẽ lấy JSON từ /swagger/json
  const documentFactory = () => aggregatedDoc;
  SwaggerModule.setup('docs', app, documentFactory, {
    jsonDocumentUrl: 'swagger/json',
  });

  await app.listen(9009);
}
bootstrap();
