export enum MediaType {
  HTML,
  XML,
  ActivityStreams,
  Image,
  Video,
  Audio,
}

export function classify(value: string): MediaType | undefined {
  const [type, ...params] = value.split(';');

  switch (type.trimEnd()) {
    case 'text/html':
    case 'application/xhtml+xml':
      return MediaType.HTML;
    case 'application/xml':
    case 'text/xml':
      return MediaType.XML;
    // TODO
    // case 'application/json+oembed':
    //   return MediaType.OEmbedJSON;
    case 'application/ld+json':
      if (
        !params.some(
          (p) => p.trim() === 'profile="https://www.w3.org/ns/activitystreams"',
        )
      ) {
        break;
      }
    // Fall through
    case 'application/activity+json':
      return MediaType.ActivityStreams;
  }

  switch (type.split('/')[0]) {
    case 'image':
      return MediaType.Image;
    case 'video':
      return MediaType.Video;
    case 'audio':
      return MediaType.Audio;
  }
}
