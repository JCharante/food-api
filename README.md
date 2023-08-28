# goodies/api

This repo uses the standard preset for eslint, minus a few rules to simplify development. 

## TODO List:

- Add tests
- Track amount of API requests per user per endpoint per day

## Getting Started

Download links:

SSH clone URL: ssh://git@git.jetbrains.space/goodies/goodies/api.git

HTTPS clone URL: https://git.jetbrains.space/goodies/goodies/api.git


These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

Times are stored in Prisma using the DateTime type and times are all UTC.

## Prerequisites

What things you need to install the software and how to install them.

```
Examples
```

## Changing the Database

https://www.prisma.io/docs/guides/migrate/developing-with-prisma-migrate#second-migration-add-new-fields

### Migrations missing from local directory

```
The following migration(s) are applied to the database but missing from the local migrations directory: 20230801135436_added_postgis_extension
```

If you know what you're doing, you can delete the migration records from the DB

https://stackoverflow.com/a/60703157

### Postgis Indexes

https://www.prisma.io/docs/guides/migrate/developing-with-prisma-migrate/include-unsupported-database-features


## Manual Testing

In addition to the app, you can use trpc playground to test the API [link](http://localhost:3000/trpc-playground)

## Deployment

Add additional notes about how to deploy this on a production system.

## Resources

Add links to external resources for this project, such as CI server, bug tracker, etc.
