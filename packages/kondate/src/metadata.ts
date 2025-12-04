/**
 * Extracted metadata of a Web page.
 *
 * This is mostly modeled after Schema.org schema, but intentionally deviates from it in some cases.
 */
export interface Metadata {
  type?: string | undefined;
  url?: string | undefined;
  name?: PronounceableText | undefined;
  /**
   * Site-specific identifier for the subject.
   */
  identifier?: string | undefined;
  inLanguage?: string | undefined;
  description?: string | undefined;
  isBasedOn?: Metadata[] | undefined;
  isPartOf?: CreativeWorkSeries | undefined;
  creator?: ((Person | Organization) & { type: string })[] | undefined;
  brand?: Brand | undefined;
  datePublished?: string | undefined;
  dateModified?: string | undefined;
  image?: ImageObject[] | undefined;
  video?: VideoObject[] | undefined;
  audio?: AudioObject[] | undefined;
  keywords?: DefinedTerm[] | undefined;
  labels?: SelfLabel[] | undefined;
  /**
   * Record containing optional resolver-specific metadata.
   */
  resolver?: ExtendedMetadataRecord;
}

export interface ExtendedMetadataRecord extends Record<string, unknown> {
  // Submodules are to augment this interface to add fields that they use.
}

export interface CreativeWorkSeries {
  name?: PronounceableText | undefined;
  url?: string | undefined;
}

export interface Person {
  type?: 'Person' | undefined;
  name?: PronounceableText | undefined;
  description?: string | undefined;
  url?: string | undefined;
  image?: ImageObject | undefined;
}

export interface Organization {
  type?: 'Organization' | undefined;
  name?: PronounceableText | undefined;
  description?: string | undefined;
  url?: string | undefined;
  image?: ImageObject | undefined;
}

export interface Brand {
  type?: 'Brand' | undefined;
  name?: PronounceableText | undefined;
  description?: string | undefined;
  url?: string | undefined;
}

export interface MediaObject {
  type?: string | undefined;
  contentUrl: string;
  name?: PronounceableText | undefined;
  encodingFormat?: string | undefined;
  ratio?: { width: number; height: number } | undefined;
  labels?: SelfLabel[] | undefined;
}

export interface ImageObject extends MediaObject {
  type?: 'ImageObject' | undefined;
}

export interface VideoObject extends MediaObject {
  type?: 'VideoObject' | undefined;
}

export interface AudioObject {
  type?: 'AudioObject' | undefined;
  contentUrl: string;
  name?: PronounceableText | undefined;
  encodingFormat?: string | undefined;
  labels?: SelfLabel[] | undefined;
}

export interface DefinedTerm {
  name: PronounceableText;
}

export interface PronounceableText {
  inLanguage?: string | undefined;
  phoneticText?: string | undefined;
  textValue: string;
}

export interface SelfLabel {
  val: string;
}
