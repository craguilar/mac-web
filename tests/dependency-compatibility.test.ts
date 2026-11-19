import test from 'node:test';
import assert from 'node:assert/strict';
import {generateGraphQLDocuments} from '@aws-amplify/graphql-docs-generator';
import {generateTypes,generateModels} from '@aws-amplify/graphql-generator';

test('security overrides preserve Amplify document, type and model generation',async()=>{
 const schema='type Query { getItem(id: ID!): Item } type Mutation { createItem(name: String!): Item } type Item { id: ID! name: String! }';
 const docs=generateGraphQLDocuments(schema,{includeMetaData:false});
 assert.ok(docs.queries.get('getItem')?.includes('getItem'));
 assert.ok(docs.mutations.get('createItem')?.includes('createItem'));
 const types=await generateTypes({schema,target:'typescript',queries:Array.from(docs.queries.values()).join('\n')});
 assert.match(types['API.ts'],/GetItemQuery/);
 const models=await generateModels({schema:'type Item @model { id: ID! name: String! }',target:'typescript',isDataStoreEnabled:true});
 assert.match(models['index.ts'],/Item/);assert.match(models['schema.ts'],/Item/);
});
