import { TimeOperation, IncrementOperation, TokenAmount, AddressType, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Limited-edition collectible releases for Lit Studios. Stores metadata, artist ownership, pricing in lamports, edition supply, and the bundled SPL mint address used during purchase fulfillment.
 */
export interface EditionsRequest {
    title: string;
    artist: string;
    artistAddress: AddressType;
    description?: string;
    coverImage?: string;
    audioUrl?: string;
    editionSize: number | TimeOperation | IncrementOperation | TokenAmount;
    remaining: number | TimeOperation | IncrementOperation | TokenAmount;
    priceSol: number | TimeOperation | IncrementOperation | TokenAmount;
    mintAddress?: string;
    editionTokenName: string;
    editionTokenSymbol: string;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface EditionsResponse {
    title: string;
    artist: string;
    artistAddress: string;
    description?: string;
    coverImage?: string;
    audioUrl?: string;
    editionSize: number;
    remaining: number;
    priceSol: number;
    mintAddress?: string;
    editionTokenName: string;
    editionTokenSymbol: string;
    createdAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a Editions operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildEditions(editionId: string, data: EditionsRequest): DocumentOperation;
/**
 * Only the artist creating the collectible can create the edition, and artistAddress must equal the caller wallet. editionSize, remaining, and priceSol are required UInt values; priceSol is stored in lamports and remaining should start equal to editionSize when created. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setEditions(editionId: string, data: EditionsRequest): Promise<boolean>;
export type EditionsRequestUpdate = Partial<EditionsRequest>;
/**
 * Build a Editions update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateEditions(editionId: string, data: EditionsRequestUpdate): DocumentOperation;
/**
 * Only the stored artistAddress can update an edition, and updates are allowed only while remaining is greater than 0 so sold-out editions become immutable. Immutable fields marked with ! such as artistAddress, editionSize, remaining, and createdAt cannot be changed after creation, so mutable edits should be limited to metadata fields like description, images, audioUrl, mintAddress, and token naming fields before sellout. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateEditions(editionId: string, data: EditionsRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Anyone can read edition records to browse collectible releases, pricing, metadata, and remaining inventory. The document is offchain and acts as the control record for the collectible release while the blockchain operations happen in sub-collections.
   (Get Single Item)
 */
export declare function getEditions(editionId: string): Promise<EditionsResponse | null>;
/**
 * Subscribes to changes in a single Editions document. (
  Read Operation Details: Anyone can read edition records to browse collectible releases, pricing, metadata, and remaining inventory. The document is offchain and acts as the control record for the collectible release while the blockchain operations happen in sub-collections.
  )
 */
export declare function subscribeEditions(callback: (data: EditionsResponse | null) => void, editionId: string): Promise<() => Promise<void>>;
/**
 * Get many Editions items from collection editions
 
  Read Operation Details: Anyone can read edition records to browse collectible releases, pricing, metadata, and remaining inventory. The document is offchain and acts as the control record for the collectible release while the blockchain operations happen in sub-collections.
  
 */
export declare function getManyEditions(filter?: string): Promise<EditionsResponse[]>;
/**
 * Subscribe to changes in Editions collection at editions
 
  Read Operation Details: Anyone can read edition records to browse collectible releases, pricing, metadata, and remaining inventory. The document is offchain and acts as the control record for the collectible release while the blockchain operations happen in sub-collections.
  
 */
export declare function subscribeManyEditions(callback: (data: EditionsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all Editions items from collection editions
 
  Read Operation Details: Anyone can read edition records to browse collectible releases, pricing, metadata, and remaining inventory. The document is offchain and acts as the control record for the collectible release while the blockchain operations happen in sub-collections.
  
 */
export declare function getAllEditions(filter?: string): Promise<EditionsResponse[]>;
/**
 * Subscribe to changes in Editions collection at editions
 
  Read Operation Details: Anyone can read edition records to browse collectible releases, pricing, metadata, and remaining inventory. The document is offchain and acts as the control record for the collectible release while the blockchain operations happen in sub-collections.
  
 */
export declare function subscribeAllEditions(callback: (data: EditionsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Count Editions items in collection editions.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countEditions(filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on Editions items in collection editions.
 * Returns a single numeric value instead of fetching full documents.
 *
 * Supported operations: 'count', 'uniqueCount', 'sum', 'avg', 'min', 'max'.
 * For 'sum', 'avg', 'min', 'max', and 'uniqueCount', you must provide the field name.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param operation - The aggregate operation to perform
 * @param opts - Options including optional filter prompt and field name
 * @returns AggregateResult with the computed numeric value
 */
export declare function aggregateEditions(operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
/**
 * Runs the "getEditionStatus" query on Editions.
 * Query Logic: (@data.remaining > 0 && 'available') || (@data.remaining == 0 && 'sold_out')
 */
export declare function runGetEditionStatusQueryForEditions(editionId: string): Promise<string>;
/**
 * Onchain passthrough operation that mints the collectible's Metaplex NFT to the buyer during purchase fulfillment.
 */
export interface EditionsMintNFTRequest {
    buyerAddress: AddressType;
    metadataUri: string;
}
export interface EditionsMintNFTResponse {
    buyerAddress: string;
    metadataUri: string;
    id: string;
    tarobase_created_at: number;
    tarobase_transaction_hash?: string | undefined;
}
/**
 * Build a EditionsMintNFT operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildEditionsMintNFT(editionId: string, mintId: string, data?: EditionsMintNFTRequest): DocumentOperation;
/**
 * Only the backend vault (PROJECT_VAULT_ADDRESS) can trigger the NFT mint after validating payment. buyerAddress is the destination wallet and metadataUri must be a valid Arweave or IPFS metadata JSON URI for the Metaplex NFT. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setEditionsMintNFT(editionId: string, mintId: string, data?: EditionsMintNFTRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Anyone can read these passthrough mint requests because onchain collections are publicly readable.
   (Get Single Item)
 */
export declare function getEditionsMintNFT(editionId: string, mintId: string): Promise<EditionsMintNFTResponse | null>;
/**
 * Subscribes to changes in a single EditionsMintNFT document. (
  Read Operation Details: Anyone can read these passthrough mint requests because onchain collections are publicly readable.
  )
 */
export declare function subscribeEditionsMintNFT(callback: (data: EditionsMintNFTResponse | null) => void, editionId: string, mintId: string): Promise<() => Promise<void>>;
/**
 * Get many EditionsMintNFT items from collection editions/${editionId}/mintNFT
 
  Read Operation Details: Anyone can read these passthrough mint requests because onchain collections are publicly readable.
  
 */
export declare function getManyEditionsMintNFT(editionId: string, filter?: string): Promise<EditionsMintNFTResponse[]>;
/**
 * Subscribe to changes in EditionsMintNFT collection at editions/${editionId}/mintNFT
 
  Read Operation Details: Anyone can read these passthrough mint requests because onchain collections are publicly readable.
  
 */
export declare function subscribeManyEditionsMintNFT(callback: (data: EditionsMintNFTResponse[]) => void, editionId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all EditionsMintNFT items from collection editions/${editionId}/mintNFT
 
  Read Operation Details: Anyone can read these passthrough mint requests because onchain collections are publicly readable.
  
 */
export declare function getAllEditionsMintNFT(editionId: string, filter?: string): Promise<EditionsMintNFTResponse[]>;
/**
 * Subscribe to changes in EditionsMintNFT collection at editions/${editionId}/mintNFT
 
  Read Operation Details: Anyone can read these passthrough mint requests because onchain collections are publicly readable.
  
 */
export declare function subscribeAllEditionsMintNFT(callback: (data: EditionsMintNFTResponse[]) => void, editionId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Count EditionsMintNFT items in collection editions/${editionId}/mintNFT.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countEditionsMintNFT(editionId: string, filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on EditionsMintNFT items in collection editions/${editionId}/mintNFT.
 * Returns a single numeric value instead of fetching full documents.
 *
 * Supported operations: 'count', 'uniqueCount', 'sum', 'avg', 'min', 'max'.
 * For 'sum', 'avg', 'min', 'max', and 'uniqueCount', you must provide the field name.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param operation - The aggregate operation to perform
 * @param opts - Options including optional filter prompt and field name
 * @returns AggregateResult with the computed numeric value
 */
export declare function aggregateEditionsMintNFT(editionId: string, operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
/**
 * Onchain passthrough operation that transfers the bundled SPL token to the buyer after the collectible NFT is minted.
 */
export interface EditionsTransferTokenRequest {
    buyerAddress: AddressType;
    amount: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface EditionsTransferTokenResponse {
    buyerAddress: string;
    amount: number;
    id: string;
    tarobase_created_at: number;
    tarobase_transaction_hash?: string | undefined;
}
/**
 * Build a EditionsTransferToken operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildEditionsTransferToken(editionId: string, transferId: string, data?: EditionsTransferTokenRequest): DocumentOperation;
/**
 * Only the backend vault (PROJECT_VAULT_ADDRESS) can trigger the passthrough token transfer after validating a purchase. This prevents unauthorized transfers of edition tokens from the artist's wallet. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setEditionsTransferToken(editionId: string, transferId: string, data?: EditionsTransferTokenRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Anyone can read these passthrough token transfer requests because onchain collections are public.
   (Get Single Item)
 */
export declare function getEditionsTransferToken(editionId: string, transferId: string): Promise<EditionsTransferTokenResponse | null>;
/**
 * Subscribes to changes in a single EditionsTransferToken document. (
  Read Operation Details: Anyone can read these passthrough token transfer requests because onchain collections are public.
  )
 */
export declare function subscribeEditionsTransferToken(callback: (data: EditionsTransferTokenResponse | null) => void, editionId: string, transferId: string): Promise<() => Promise<void>>;
/**
 * Get many EditionsTransferToken items from collection editions/${editionId}/transferToken
 
  Read Operation Details: Anyone can read these passthrough token transfer requests because onchain collections are public.
  
 */
export declare function getManyEditionsTransferToken(editionId: string, filter?: string): Promise<EditionsTransferTokenResponse[]>;
/**
 * Subscribe to changes in EditionsTransferToken collection at editions/${editionId}/transferToken
 
  Read Operation Details: Anyone can read these passthrough token transfer requests because onchain collections are public.
  
 */
export declare function subscribeManyEditionsTransferToken(callback: (data: EditionsTransferTokenResponse[]) => void, editionId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all EditionsTransferToken items from collection editions/${editionId}/transferToken
 
  Read Operation Details: Anyone can read these passthrough token transfer requests because onchain collections are public.
  
 */
export declare function getAllEditionsTransferToken(editionId: string, filter?: string): Promise<EditionsTransferTokenResponse[]>;
/**
 * Subscribe to changes in EditionsTransferToken collection at editions/${editionId}/transferToken
 
  Read Operation Details: Anyone can read these passthrough token transfer requests because onchain collections are public.
  
 */
export declare function subscribeAllEditionsTransferToken(callback: (data: EditionsTransferTokenResponse[]) => void, editionId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Count EditionsTransferToken items in collection editions/${editionId}/transferToken.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countEditionsTransferToken(editionId: string, filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on EditionsTransferToken items in collection editions/${editionId}/transferToken.
 * Returns a single numeric value instead of fetching full documents.
 *
 * Supported operations: 'count', 'uniqueCount', 'sum', 'avg', 'min', 'max'.
 * For 'sum', 'avg', 'min', 'max', and 'uniqueCount', you must provide the field name.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param operation - The aggregate operation to perform
 * @param opts - Options including optional filter prompt and field name
 * @returns AggregateResult with the computed numeric value
 */
export declare function aggregateEditionsTransferToken(editionId: string, operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
/**
 * Offchain audit trail for individual collectible purchases, including buyer identifiers, order linkage, pricing, and blockchain transaction references.
 */
export interface EditionsPurchasesRequest {
    editionId: string;
    buyerEmail: string;
    buyerAddress?: string;
    orderId?: string;
    solPrice?: number | TimeOperation | IncrementOperation | TokenAmount;
    status: string;
    nftMintTx?: string;
    tokenTransferTx?: string;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface EditionsPurchasesResponse {
    editionId: string;
    buyerEmail: string;
    buyerAddress?: string;
    orderId?: string;
    solPrice?: number;
    status: string;
    nftMintTx?: string;
    tokenTransferTx?: string;
    createdAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a EditionsPurchases operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildEditionsPurchases(editionId: string, purchaseId: string, data: EditionsPurchasesRequest): DocumentOperation;
/**
 * Only the backend vault can create purchase records when checkout or fulfillment begins. editionId and createdAt are immutable after creation, buyerEmail is required, and status should be set to values like 'pending', 'completed', or 'failed'. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setEditionsPurchases(editionId: string, purchaseId: string, data: EditionsPurchasesRequest): Promise<boolean>;
export type EditionsPurchasesRequestUpdate = Partial<EditionsPurchasesRequest>;
/**
 * Build a EditionsPurchases update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateEditionsPurchases(editionId: string, purchaseId: string, data: EditionsPurchasesRequestUpdate): DocumentOperation;
/**
 * Only the backend vault can update purchase records, typically to attach buyerAddress, orderId, solPrice, nftMintTx, tokenTransferTx, or to transition status through the fulfillment lifecycle. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateEditionsPurchases(editionId: string, purchaseId: string, data: EditionsPurchasesRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Only ADMIN_ADDRESS and PROJECT_VAULT_ADDRESS can read collectible purchase audit records. This preserves buyer purchase details while still allowing backend processing and admin review.
   (Get Single Item)
 */
export declare function getEditionsPurchases(editionId: string, purchaseId: string): Promise<EditionsPurchasesResponse | null>;
/**
 * Subscribes to changes in a single EditionsPurchases document. (
  Read Operation Details: Only ADMIN_ADDRESS and PROJECT_VAULT_ADDRESS can read collectible purchase audit records. This preserves buyer purchase details while still allowing backend processing and admin review.
  )
 */
export declare function subscribeEditionsPurchases(callback: (data: EditionsPurchasesResponse | null) => void, editionId: string, purchaseId: string): Promise<() => Promise<void>>;
/**
 * Get many EditionsPurchases items from collection editions/${editionId}/purchases
 
  Read Operation Details: Only ADMIN_ADDRESS and PROJECT_VAULT_ADDRESS can read collectible purchase audit records. This preserves buyer purchase details while still allowing backend processing and admin review.
  
 */
export declare function getManyEditionsPurchases(editionId: string, filter?: string): Promise<EditionsPurchasesResponse[]>;
/**
 * Subscribe to changes in EditionsPurchases collection at editions/${editionId}/purchases
 
  Read Operation Details: Only ADMIN_ADDRESS and PROJECT_VAULT_ADDRESS can read collectible purchase audit records. This preserves buyer purchase details while still allowing backend processing and admin review.
  
 */
export declare function subscribeManyEditionsPurchases(callback: (data: EditionsPurchasesResponse[]) => void, editionId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all EditionsPurchases items from collection editions/${editionId}/purchases
 
  Read Operation Details: Only ADMIN_ADDRESS and PROJECT_VAULT_ADDRESS can read collectible purchase audit records. This preserves buyer purchase details while still allowing backend processing and admin review.
  
 */
export declare function getAllEditionsPurchases(editionId: string, filter?: string): Promise<EditionsPurchasesResponse[]>;
/**
 * Subscribe to changes in EditionsPurchases collection at editions/${editionId}/purchases
 
  Read Operation Details: Only ADMIN_ADDRESS and PROJECT_VAULT_ADDRESS can read collectible purchase audit records. This preserves buyer purchase details while still allowing backend processing and admin review.
  
 */
export declare function subscribeAllEditionsPurchases(callback: (data: EditionsPurchasesResponse[]) => void, editionId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Onchain passthrough that transfers SOL from the buyer to the artist when purchasing an edition. Price and destination are read from the parent edition document so the buyer cannot tamper with either value.
 */
export interface EditionsPayRequest {
}
export interface EditionsPayResponse {
    id: string;
    tarobase_created_at: number;
    tarobase_transaction_hash?: string | undefined;
}
/**
 * Build a EditionsPay operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildEditionsPay(editionId: string, payId: string, data?: EditionsPayRequest): DocumentOperation;
/**
 * Any authenticated user can pay for an edition. The hook reads priceSol and artistAddress from the parent edition document, enforcing the correct payment amount and destination. The buyer cannot tamper with either value. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setEditionsPay(editionId: string, payId: string, data?: EditionsPayRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Public read.
   (Get Single Item)
 */
export declare function getEditionsPay(editionId: string, payId: string): Promise<EditionsPayResponse | null>;
/**
 * Subscribes to changes in a single EditionsPay document. (
  Read Operation Details: Public read.
  )
 */
export declare function subscribeEditionsPay(callback: (data: EditionsPayResponse | null) => void, editionId: string, payId: string): Promise<() => Promise<void>>;
/**
 * Get many EditionsPay items from collection editions/${editionId}/pay
 
  Read Operation Details: Public read.
  
 */
export declare function getManyEditionsPay(editionId: string, filter?: string): Promise<EditionsPayResponse[]>;
/**
 * Subscribe to changes in EditionsPay collection at editions/${editionId}/pay
 
  Read Operation Details: Public read.
  
 */
export declare function subscribeManyEditionsPay(callback: (data: EditionsPayResponse[]) => void, editionId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all EditionsPay items from collection editions/${editionId}/pay
 
  Read Operation Details: Public read.
  
 */
export declare function getAllEditionsPay(editionId: string, filter?: string): Promise<EditionsPayResponse[]>;
/**
 * Subscribe to changes in EditionsPay collection at editions/${editionId}/pay
 
  Read Operation Details: Public read.
  
 */
export declare function subscribeAllEditionsPay(callback: (data: EditionsPayResponse[]) => void, editionId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Count EditionsPay items in collection editions/${editionId}/pay.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countEditionsPay(editionId: string, filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on EditionsPay items in collection editions/${editionId}/pay.
 * Returns a single numeric value instead of fetching full documents.
 *
 * Supported operations: 'count', 'uniqueCount', 'sum', 'avg', 'min', 'max'.
 * For 'sum', 'avg', 'min', 'max', and 'uniqueCount', you must provide the field name.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param operation - The aggregate operation to perform
 * @param opts - Options including optional filter prompt and field name
 * @returns AggregateResult with the computed numeric value
 */
export declare function aggregateEditionsPay(editionId: string, operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
