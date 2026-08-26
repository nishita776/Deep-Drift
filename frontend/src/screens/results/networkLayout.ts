import type { KnownTaxon, NovelCluster } from '../../api/types'
import { splitMatchedTaxon } from '../../lib/format'

/**
 * Deterministic radial tree layout for the taxonomic network (A4). This is
 * a genuine hierarchy (Phylum -> Class -> Species), so a tree layout beats
 * a physics force simulation for legibility and never needs to converge —
 * positions are computed once, not simulated. No d3-force dependency.
 */

export type NetworkNodeKind = 'root' | 'phylum' | 'class' | 'species' | 'cluster'

export interface NetworkNode {
  id: string
  kind: NetworkNodeKind
  label: string
  /** Owning phylum, for color — null only for the root. */
  phylum: string | null
  readCount: number
  x: number
  y: number
  r: number
  depth: number
  parentId: string | null
  cluster?: NovelCluster
}

export interface NetworkEdge {
  id: string
  fromId: string
  toId: string
  /** Novel-cluster edges only — visually distinct and uncertain, never styled like a confirmed species link. */
  isClusterEdge: boolean
}

export interface NetworkLayout {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
}

interface TreeNode {
  id: string
  kind: NetworkNodeKind
  label: string
  phylum: string | null
  readCount: number
  cluster?: NovelCluster
  children: TreeNode[]
}

const DEPTH_RADIUS = [0, 110, 190, 270]
const MIN_R = 4
const MAX_R = 26
const R_SCALE = 3.2

function nodeRadius(readCount: number): number {
  return Math.min(MAX_R, MIN_R + R_SCALE * Math.sqrt(Math.max(1, readCount)))
}

/**
 * nearest_reference's exact format differs between adapters: the mock uses
 * "Phylum > Class > species (NN% identity)", but the real backend uses the
 * same pipe-delimited reference-header format as matched_taxon
 * ("id|Phylum|Class|species"). Accept either rather than assuming one —
 * this is display-only parsing for the tree attachment point, never
 * re-rendered, so getting it wrong just means a cluster falls back to the
 * root instead of crashing.
 */
function parseNearestReferencePrefix(nearestReference: string): { phylum: string; class: string } | null {
  if (nearestReference.includes('|')) {
    const parts = nearestReference.split('|')
    if (parts.length < 3) return null
    return { phylum: parts[1].trim(), class: parts[2].trim() }
  }
  const match = /^([^>]+)>([^>]+)>/.exec(nearestReference)
  if (!match) return null
  return { phylum: match[1].trim(), class: match[2].trim() }
}

function buildTree(knownTaxa: KnownTaxon[], novelClusters: NovelCluster[]): TreeNode {
  const root: TreeNode = { id: 'root', kind: 'root', label: 'root', phylum: null, readCount: 0, children: [] }
  const phylumMap = new Map<string, TreeNode>()
  const classMap = new Map<string, TreeNode>()
  const speciesMap = new Map<string, TreeNode>()

  function getPhylum(name: string): TreeNode {
    let node = phylumMap.get(name)
    if (!node) {
      node = { id: `phylum:${name}`, kind: 'phylum', label: name, phylum: name, readCount: 0, children: [] }
      phylumMap.set(name, node)
      root.children.push(node)
    }
    return node
  }

  function getClass(phylumName: string, className: string): TreeNode {
    const key = `${phylumName}::${className}`
    let node = classMap.get(key)
    if (!node) {
      const phylumNode = getPhylum(phylumName)
      node = { id: `class:${key}`, kind: 'class', label: className, phylum: phylumName, readCount: 0, children: [] }
      classMap.set(key, node)
      phylumNode.children.push(node)
    }
    return node
  }

  for (const row of knownTaxa) {
    // Never render the raw matched_taxon string — always split client-side (D6).
    const { phylum, class: taxClass, species } = splitMatchedTaxon(row.matched_taxon)
    if (!phylum || !taxClass || !species) continue
    const classNode = getClass(phylum, taxClass)
    const speciesKey = `${phylum}::${taxClass}::${species}`
    let speciesNode = speciesMap.get(speciesKey)
    if (!speciesNode) {
      speciesNode = { id: `species:${speciesKey}`, kind: 'species', label: species, phylum, readCount: 0, children: [] }
      speciesMap.set(speciesKey, speciesNode)
      classNode.children.push(speciesNode)
    }
    speciesNode.readCount += row.count
  }

  for (const cluster of novelClusters) {
    const prefix = parseNearestReferencePrefix(cluster.nearest_reference)
    const parent = prefix ? getClass(prefix.phylum, prefix.class) : root
    const clusterNode: TreeNode = {
      id: `cluster:${cluster.id}`,
      kind: 'cluster',
      label: cluster.placeholder_id,
      phylum: parent.phylum,
      readCount: cluster.total_reads,
      cluster,
      children: [],
    }
    parent.children.push(clusterNode)
  }

  function rollUp(node: TreeNode): number {
    if (node.children.length === 0) return node.readCount
    node.readCount = node.children.reduce((sum, c) => sum + rollUp(c), 0)
    return node.readCount
  }
  rollUp(root)

  return root
}

function layoutTree(root: TreeNode, cx: number, cy: number): NetworkLayout {
  const nodes: NetworkNode[] = []
  const edges: NetworkEdge[] = []

  function place(node: TreeNode, depth: number, angleStart: number, angleEnd: number, parentId: string | null) {
    const angleMid = (angleStart + angleEnd) / 2
    const radius = DEPTH_RADIUS[Math.min(depth, DEPTH_RADIUS.length - 1)]
    const x = depth === 0 ? cx : cx + radius * Math.cos(angleMid)
    const y = depth === 0 ? cy : cy + radius * Math.sin(angleMid)

    nodes.push({
      id: node.id,
      kind: node.kind,
      label: node.label,
      phylum: node.phylum,
      readCount: node.readCount,
      x,
      y,
      r: depth === 0 ? 5 : nodeRadius(node.readCount),
      depth,
      parentId,
      cluster: node.cluster,
    })

    if (parentId) {
      edges.push({ id: `edge:${parentId}->${node.id}`, fromId: parentId, toId: node.id, isClusterEdge: node.kind === 'cluster' })
    }

    if (node.children.length === 0) return
    const totalWeight = node.children.reduce((sum, c) => sum + Math.max(1, c.readCount), 0)
    const span = angleEnd - angleStart
    let cursor = angleStart
    for (const child of node.children) {
      const weight = Math.max(1, child.readCount)
      const childSpan = (weight / totalWeight) * span
      place(child, depth + 1, cursor, cursor + childSpan, node.id)
      cursor += childSpan
    }
  }

  place(root, 0, 0, Math.PI * 2, null)
  return { nodes, edges }
}

export function buildNetworkLayout(knownTaxa: KnownTaxon[], novelClusters: NovelCluster[], cx: number, cy: number): NetworkLayout {
  return layoutTree(buildTree(knownTaxa, novelClusters), cx, cy)
}

/** All descendant ids of a node (inclusive), for the click-to-isolate interaction. */
export function subtreeIds(nodes: NetworkNode[], rootId: string): Set<string> {
  const byParent = new Map<string, string[]>()
  for (const n of nodes) {
    if (n.parentId) {
      const arr = byParent.get(n.parentId) ?? []
      arr.push(n.id)
      byParent.set(n.parentId, arr)
    }
  }
  const result = new Set<string>([rootId])
  const stack = [rootId]
  while (stack.length > 0) {
    const id = stack.pop()!
    for (const childId of byParent.get(id) ?? []) {
      if (!result.has(childId)) {
        result.add(childId)
        stack.push(childId)
      }
    }
  }
  return result
}

/** Ancestor chain back to root, so isolating a leaf keeps its path visible too. */
export function ancestorIds(nodes: NetworkNode[], nodeId: string): Set<string> {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const result = new Set<string>()
  let current = byId.get(nodeId)
  while (current?.parentId) {
    result.add(current.parentId)
    current = byId.get(current.parentId)
  }
  return result
}
