version: 1.0.0

project:
  name: customer-locator-api
  language: typescript
  framework: express
  description: Offline geo-localized customer REST service

database:
  url: ${DATABASE_URL}

server:
  host: 0.0.0.0
  port: 3000

data:
  seedFile: seed-customers.json
  coordinatesRef: ellenorzo-adatok.md

steps:
  - npm-install
  - migrate-db
  - seed-data
  - run-tests
