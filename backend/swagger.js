const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EasyEvent API Documentation',
      version: '1.0.0',
      description: 'API สำหรับระบบจัดการกิจกรรม EasyEvent (Project ปี 3)',
      contact: {
        name: 'Au & Pat', 
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local Server (เครื่องเรา)',
      },
      {
        url: 'https://easyevent.onrender.com', 
        description: 'Production Server (บน Cloud)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./routes/*.js'], 
};

const specs = swaggerJsdoc(options);

module.exports = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
  console.log('📄 Swagger Docs available at http://localhost:5000/api-docs');
};