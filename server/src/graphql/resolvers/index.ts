import { GraphQLScalarType, Kind } from 'graphql';
import { authResolvers } from './auth.js';
import { conversationResolvers } from './conversations.js';
import { messageResolvers } from './messages.js';

const DateScalar = new GraphQLScalarType({
  name: 'Date',
  description: 'Date custom scalar type',
  serialize(value: any) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string') {
      return value;
    }
    return null;
  },
  parseValue(value: any) {
    if (typeof value === 'string') {
      return new Date(value);
    }
    return value;
  },
  parseLiteral(ast: any) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

export const resolvers = {
  Date: DateScalar,
  Query: {
    ...authResolvers.Query,
    ...conversationResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...conversationResolvers.Mutation,
    ...messageResolvers.Mutation,
  },
};

