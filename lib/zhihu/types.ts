export interface ZhihuUser {
  uid: string;
  hashId: string;
  fullname: string;
  gender: string;
  headline: string;
  description: string;
  avatarUrl: string;
  url: string;
}

export interface ZhihuHotItem {
  title: string;
  url: string;
  thumbnailUrl: string;
  summary: string;
}

export interface ZhihuFollowee {
  fullname: string;
  urlToken: string;
  url: string;
  avatarUrl: string;
  headline: string;
  followerCount: number;
}

export interface ZhihuContentItem {
  contentType: string;
  url: string;
  createdAt: number;
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
  title: string;
  summary: string;
}

export interface ZhihuPaging {
  isEnd: boolean;
  nextOffset: string | null;
  totals: number;
}

export interface ZhihuPage<T> {
  items: T[];
  paging: ZhihuPaging;
}
