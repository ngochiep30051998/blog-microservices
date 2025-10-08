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
    servers: [],
    tags: [],
    paths: {},
    components: {},
  };

  for (const doc of docs) {
    // servers
    if (Array.isArray(doc.servers)) {
      base.servers.push(...doc.servers);
    }
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
  const [doc1, doc2] = await Promise.all([
    fetchOpenApi('http://localhost:9001/docs-json'),
    fetchOpenApi('http://localhost:9002/docs-json'),
  ]);

  aggregatedDoc = mergeOpenApi([doc1, doc2]);

  // Mount Swagger UI sử dụng jsonDocumentUrl đọc từ /swagger/json
  const options = new DocumentBuilder()
    .setTitle('Aggregated APIs')
    .setVersion('1.0.0')
    .build();

  // Dùng documentFactory dạng “placeholder”; UI sẽ lấy JSON từ /swagger/json
  const documentFactory = () => aggregatedDoc;
  SwaggerModule.setup('docs', app, documentFactory, {
    jsonDocumentUrl: 'swagger/json',
  });

  await app.listen(9009);
}
bootstrap();
