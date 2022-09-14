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
const utils = require('../utils');

const typeDefs = gql`
  extend schema
    @link(
      url: "https://specs.apollo.dev/federation/v2.0"
      import: ["@key", "@shareable"]
    )

  type Location @key(fields: "streetAddress") {
    # full and valid street address
    streetAddress: String!
    latitude: Float
    longitude: Float
    neighbourhood: String
    region: String
    county: String
    country: String
    continent: String
  }
`;

const resolvers = {
  Location: {
    __resolveReference: async ({ streetAddress }, context) => {
      await timeout(context.artificialDelay);
      return await fetch(
        `https://positionstack.com/geo_api.php?query=${encodeURI(
          streetAddress
        )}`
      )
        .then(async (res) => {
          if (res.ok) {
            const response = await res.json();
            return utils.snakeToCamel(response.data[0]);
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
    graphRef: 'simple-servers@address-enrichment'
  },
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
  plugins: [
    ApolloServerPluginLandingPageLocalDefault({ embed: true }),
    ApolloServerPluginInlineTrace(),
    ...(process.env.NODE_ENV === 'production'
      ? [ApolloServerPluginUsageReporting()]
      : [])
  ],
  context: async () => {
    return await fetch(
      'https://simple-graphql-servers.netlify.app/.netlify/functions/get-artificial-delay'
    )
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          return data;
        } else {
          throw new Error('Error fetching artificial delay variable');
        }
      })
      .catch((err) => new Error(err));
  }
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
      port: process.env.PORT || 4001
    })
    .then(({ url }) => {
      console.log(`🚀  Server is running on ${url}`);
    });
}
