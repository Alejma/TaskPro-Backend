const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'TaskPro API',
      version: '1.0.0',
      description: 'Documentación oficial del backend TaskPro.'
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor local'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', example: 'admin@taskpro.com' },
            password: { type: 'string', example: 'Admin123*' }
          }
        },
        UserCreateRequest: {
          type: 'object',
          required: ['name', 'email', 'password', 'roleName'],
          properties: {
            name: { type: 'string', example: 'Juan Pérez' },
            email: { type: 'string', example: 'juan@taskpro.com' },
            password: { type: 'string', example: 'Password123*' },
            roleName: { type: 'string', enum: ['ADMIN', 'GERENTE', 'COLABORADOR'] }
          }
        },
        ProjectRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', example: 'Proyecto ERP' },
            description: { type: 'string', example: 'Implementación módulo financiero' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            ownerId: { type: 'integer', example: 1 }
          }
        },
        TaskRequest: {
          type: 'object',
          required: ['title', 'projectId'],
          properties: {
            title: { type: 'string', example: 'Diseñar base de datos' },
            description: { type: 'string', example: 'Modelo inicial para tareas y usuarios' },
            projectId: { type: 'integer', example: 1 },
            priority: { type: 'integer', example: 2 },
            dueDate: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'DONE'] },
            userIds: {
              type: 'array',
              items: { type: 'integer' },
              example: [2, 3]
            }
          }
        },
        CommentRequest: {
          type: 'object',
          required: ['content', 'taskId'],
          properties: {
            content: { type: 'string', example: 'Revisar dependencias antes de desplegar.' },
            taskId: { type: 'integer', example: 10 }
          }
        }
      }
    },
    paths: {
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Iniciar sesión',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginRequest' }
              }
            }
          },
          responses: {
            200: { description: 'Login exitoso' },
            401: { description: 'Credenciales inválidas' }
          }
        }
      },
      '/api/users': {
        post: {
          tags: ['Users'],
          summary: 'Crear usuario (ADMIN)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserCreateRequest' }
              }
            }
          },
          responses: { 201: { description: 'Usuario creado' } }
        },
        get: {
          tags: ['Users'],
          summary: 'Listar usuarios',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Listado de usuarios' } }
        }
      },
      '/api/users/{id}': {
        put: {
          tags: ['Users'],
          summary: 'Editar usuario',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserCreateRequest' }
              }
            }
          },
          responses: { 200: { description: 'Usuario actualizado' } }
        }
      },
      '/api/users/{id}/status': {
        patch: {
          tags: ['Users'],
          summary: 'Activar/desactivar usuario',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { isActive: { type: 'boolean' } }
                }
              }
            }
          },
          responses: { 200: { description: 'Estado actualizado' } }
        }
      },
      '/api/projects': {
        post: {
          tags: ['Projects'],
          summary: 'Crear proyecto',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProjectRequest' }
              }
            }
          },
          responses: { 201: { description: 'Proyecto creado' } }
        },
        get: {
          tags: ['Projects'],
          summary: 'Listar proyectos según rol',
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Listado de proyectos' } }
        }
      },
      '/api/projects/{id}': {
        get: {
          tags: ['Projects'],
          summary: 'Obtener proyecto por id',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Proyecto' } }
        },
        put: {
          tags: ['Projects'],
          summary: 'Editar proyecto',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProjectRequest' }
              }
            }
          },
          responses: { 200: { description: 'Proyecto actualizado' } }
        },
        delete: {
          tags: ['Projects'],
          summary: 'Eliminar proyecto lógicamente',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Proyecto eliminado' } }
        }
      },
      '/api/projects/{id}/status': {
        patch: {
          tags: ['Projects'],
          summary: 'Cambiar estado del proyecto',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['ACTIVE', 'PAUSED', 'FINISHED'] }
                  }
                }
              }
            }
          },
          responses: { 200: { description: 'Estado actualizado' } }
        }
      },
      '/api/tasks': {
        post: {
          tags: ['Tasks'],
          summary: 'Crear tarea',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TaskRequest' }
              }
            }
          },
          responses: { 201: { description: 'Tarea creada' } }
        }
      },
      '/api/tasks/project/{id}': {
        get: {
          tags: ['Tasks'],
          summary: 'Listar tareas por proyecto',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Listado de tareas' } }
        }
      },
      '/api/tasks/kanban/{projectId}': {
        get: {
          tags: ['Tasks'],
          summary: 'Tablero Kanban por proyecto',
          description: 'Agrupa tareas por estado: PENDING, IN_PROGRESS, DONE.',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'projectId', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Estructura Kanban' } }
        }
      },
      '/api/tasks/{id}/status': {
        patch: {
          tags: ['Tasks'],
          summary: 'Mover tarea entre columnas',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status'],
                  properties: {
                    status: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'DONE'] }
                  }
                }
              }
            }
          },
          responses: { 200: { description: 'Estado de tarea actualizado' } }
        }
      },
      '/api/tasks/{id}': {
        put: {
          tags: ['Tasks'],
          summary: 'Editar tarea',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TaskRequest' }
              }
            }
          },
          responses: { 200: { description: 'Tarea actualizada' } }
        }
      },
      '/api/comments': {
        post: {
          tags: ['Comments'],
          summary: 'Crear comentario',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CommentRequest' }
              }
            }
          },
          responses: { 201: { description: 'Comentario creado' } }
        }
      },
      '/api/comments/task/{id}': {
        get: {
          tags: ['Comments'],
          summary: 'Listar comentarios por tarea',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'Listado de comentarios' } }
        }
      }
    }
  },
  apis: []
};

const swaggerSpec = swaggerJSDoc(options);

const setupSwagger = (app) => {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};

module.exports = setupSwagger;
