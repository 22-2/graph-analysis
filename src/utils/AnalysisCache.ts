import { LRUCache } from 'lru-cache'
import type { AnalysisCacheMap, AnalysisCacheValue } from 'src/Interfaces'

export class AnalysisCache {
  private cache: LRUCache<string, AnalysisCacheValue>

  constructor(options: { max: number; ttl: number }) {
    this.cache = new LRUCache(options)
  }

  getHITS(): AnalysisCacheMap['HITS'] | undefined {
    return this.cache.get('HITS:') as AnalysisCacheMap['HITS'] | undefined
  }
  setHITS(value: AnalysisCacheMap['HITS']): void {
    this.cache.set('HITS:', value)
  }

  getCoCitations(node: string): AnalysisCacheMap['Co-Citations'] | undefined {
    return this.cache.get(`Co-Citations:${node}`) as AnalysisCacheMap['Co-Citations'] | undefined
  }
  setCoCitations(node: string, value: AnalysisCacheMap['Co-Citations']): void {
    this.cache.set(`Co-Citations:${node}`, value)
  }

  getLouvain(node: string, resolution: number): AnalysisCacheMap['Louvain'] | undefined {
    return this.cache.get(`Louvain:${node}:${resolution}`) as AnalysisCacheMap['Louvain'] | undefined
  }
  setLouvain(node: string, resolution: number, value: AnalysisCacheMap['Louvain']): void {
    this.cache.set(`Louvain:${node}:${resolution}`, value)
  }

  getLabelPropagation(iterations: number): AnalysisCacheMap['Label Propagation'] | undefined {
    return this.cache.get(`Label Propagation:${iterations}`) as AnalysisCacheMap['Label Propagation'] | undefined
  }
  setLabelPropagation(iterations: number, value: AnalysisCacheMap['Label Propagation']): void {
    this.cache.set(`Label Propagation:${iterations}`, value)
  }

  getResultMap(subtype: string, node: string): AnalysisCacheMap['Jaccard'] | undefined {
    return this.cache.get(`${subtype}:${node}`) as AnalysisCacheMap['Jaccard'] | undefined
  }
  setResultMap(subtype: string, node: string, value: AnalysisCacheMap['Jaccard']): void {
    this.cache.set(`${subtype}:${node}`, value)
  }

  clear(): void {
    this.cache.clear()
  }
}
