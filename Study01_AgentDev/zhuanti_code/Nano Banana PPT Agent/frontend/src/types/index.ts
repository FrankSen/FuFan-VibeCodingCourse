export interface Version {
  id: string;
  url: string;
  prompt: string;
  timestamp: string;
}

export interface Slide {
  id: number;
  activeVersionId: string;
  versions: Version[];
}

export interface Project {
  id: string;
  title: string;
  coverImage: string;
  slideCount: number;
  modifiedTime: string;
  slides?: Slide[];
}
