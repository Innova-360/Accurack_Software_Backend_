import Fuse from 'fuse.js';

export interface FuzzyMatchResult {
  item: string;
  score: number;
}

export class FuzzyMatcher {
  private fuse: Fuse<string>;

  constructor(items: string[], threshold: number = 0.3) {
    const options = {
      threshold,
      includeScore: true,
      minMatchCharLength: 2,
    };   this.fuse = new Fuse(items, options);
  }

  search(query: string, maxResults: number = 3): FuzzyMatchResult[] {
    const results = this.fuse.search(query, { limit: maxResults });
    return results.map(result => ({
      item: result.item,
      score: result.score || 0,
    }));
  }

  findBestMatch(query: string): FuzzyMatchResult | null {
    const results = this.search(query, 1);
    return results.length > 0 ? results[0] : null;
  }
}