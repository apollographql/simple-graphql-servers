const { ApolloServer, gql } =
  process.env.NODE_ENV === 'production'
    ? require('apollo-server-lambda')
    : require('apollo-server');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const fetch = require('node-fetch');
const {
  ApolloServerPluginLandingPageLocalDefault
} = require('apollo-server-core');
const { ApolloServerPluginUsageReporting } = require('apollo-server-core');
const { ApolloServerPluginInlineTrace } = require('apollo-server-core');
const utils = require('../utils/utils');
const { typeDefs: scalarTypeDefs } = require('graphql-scalars');

const typeDefs = gql`
  ${scalarTypeDefs}

  extend schema
    @link(
      url: "https://specs.apollo.dev/federation/v2.0"
      import: ["@key", "@shareable"]
    )

  type Query {
    ipLocation(ip: String!): Location
    # giveError(message: String): String
  }

  type Location @key(fields: "latitude longitude") {
    latitude: Float
    longitude: Float
    postal: String
    timezone: String
  }
`;

const resolvers = {
  Query: {
    giveError: (_, { message }) => {
      throw new Error(message || 'Hello! This is the error you requested.');
    },
    ipLocation: async (_, { ip }) => {
      return await fetch(
        `https://ipinfo.io/${encodeURI(ip)}?token=${process.env.IP_INFO_KEY}`
      )
        .then(async (res) => {
          if (res.ok) {
            const response = await res.json();
            const [latitude, longitude] = response.loc.split(',');
            return utils.snakeToCamel({
              latitude,
              longitude,
              ...response
            });
          } else {
            throw new Error('Error fetching data. Did you include an API Key?');
          }
        })
        .catch((err) => new Error(err));
    }
  }
};

const server = new ApolloServer({
  introspection: true,
  apollo: {
    graphRef: 'simple-servers2@ip-enrichment'
  },
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
  plugins: [
    ApolloServerPluginLandingPageLocalDefault({ embed: true }),
    ApolloServerPluginInlineTrace(),
    ...(process.env.NODE_ENV === 'production'
      ? [ApolloServerPluginUsageReporting()]
      : [])
  ]
});

const getHandler = (event, context) => {
  const graphqlHandler = server.createHandler();
  if (!event.requestContext) {
    event.requestContext = context;
  }
  return graphqlHandler(event, context);
};

exports.handler = getHandler;

if (process.env.NODE_ENV !== 'production') {
  server
    .listen({
      port: process.env.PORT || 4004
    })
    .then(({ url }) => {
      console.log(`🚀  Server is running on ${url}`);
    });
}
