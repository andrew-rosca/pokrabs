// Prisma 7+ configuration file
// Connection URL is configured here instead of schema.prisma

export default {
  datasource: {
    url: process.env.DATABASE_URL || 'file:./data/pokrabs.db',
  },
};
