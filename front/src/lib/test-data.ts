import {
  BrainIcon,
  BugIcon,
  CpuIcon,
  DatabaseIcon,
  LightbulbIcon,
  RocketIcon,
  SearchIcon,
  TerminalIcon,
  TestTube2Icon,
  ZapIcon,
} from "lucide-react";

export type TestCategory =
  | "basic"
  | "search"
  | "automation"
  | "advanced"
  | "tests"
  | "nextjs"
  | "react19"
  | "php-symfony"
  | "php-laravel"
  | "php-api-platform"
  | "vuejs"
  | "devops";

export type Difficulty = "easy" | "normal" | "hard";

export interface TestStep {
  id: string;
  title: string;
  description: string;
  prompt?: string;
  expected: string;
  code?: string;
  category: TestCategory;
  difficulty: Difficulty;
}

export const testSteps: Array<TestStep> = [
  // ===== BASICS =====
  {
    id: "check-mcp",
    title: "Vérifier la configuration MCP",
    description:
      "Avant de commencer, vérifiez que le serveur MCP free-context est bien configuré et actif.",
    code: "claude mcp list\n# Vous devriez voir : free-context: bun .../server/src/index.ts",
    expected: "Le serveur free-context apparaît dans la liste",
    category: "basic",
    difficulty: "easy",
  },
  {
    id: "create-context",
    title: "Créer un contexte",
    description:
      "Créez votre premier contexte pour organiser vos connaissances.",
    prompt:
      'Utilise le MCP free-context pour créer un contexte "React Performance Tips" avec stack="react19", difficulty="easy", description "Astuces pour optimiser les applications React" et les tags react, performance, hooks',
    expected:
      "Claude utilise l'outil create_context avec stack et difficulty, retourne un ID de contexte",
    category: "basic",
    difficulty: "easy",
  },
  {
    id: "add-note",
    title: "Ajouter une note",
    description: "Ajoutez une connaissance théorique à votre contexte.",
    prompt:
      'Ajoute une mémoire de type "note" dans le contexte "React Performance Tips" avec le titre "useMemo et useCallback", le contenu "useMemo sert à mémoriser le résultat d\'un calcul coûteux. useCallback sert à mémoriser une fonction pour éviter que les composants enfants ne re-render si la fonction change.", stack="react19", et difficulty="easy"',
    expected:
      'Claude utilise add_memory avec type="note", stack="react19", difficulty="easy"',
    category: "basic",
    difficulty: "easy",
  },
  {
    id: "add-snippet",
    title: "Ajouter un snippet",
    description: "Ajoutez un bout de code réutilisable.",
    prompt:
      'Ajoute une mémoire de type "snippet" avec le titre "Exemple de custom hook pour fetch" et le contenu "import { useState, useEffect } from \'react\'; export function useFetch<T>(url: string) { const [data, setData] = useState<T | null>(null); const [loading, setLoading] = useState(true); useEffect(() => { fetch(url).then(res => res.json()).then(setData).finally(() => setLoading(false)); }, [url]); return { data, loading }; }"',
    expected: 'Claude utilise add_memory avec type="snippet"',
    category: "basic",
    difficulty: "easy",
  },
  {
    id: "add-reference",
    title: "Ajouter une référence",
    description: "Ajoutez un lien vers une ressource externe.",
    prompt:
      'Ajoute une mémoire de type "reference" avec le titre "React Compiler" et le contenu "Le React Compiler automatise les optimisations useMemo, useCallback, Memo." et l\'url "https://react.dev/learn/react-compiler"',
    expected: 'Claude utilise add_memory avec type="reference"',
    category: "basic",
    difficulty: "easy",
  },
  {
    id: "list-contexts",
    title: "Lister les contextes",
    description: "Visualisez tous vos contextes.",
    prompt: "Liste tous les contextes disponibles avec free-context",
    expected: "Claude utilise list_contexts et affiche la liste",
    category: "basic",
    difficulty: "easy",
  },
  {
    id: "create-with-stack",
    title: "Créer avec stack et difficulty",
    description:
      "Créez un contexte avec catégorisation par stack et niveau de difficulté.",
    prompt:
      'Crée un contexte "Next.js 16 Patterns" avec stack="nextjs", difficulty="normal", description "Patterns avancés Next.js 16" et les tags nextjs, patterns, performance',
    expected:
      'Claude utilise create_context avec stack="nextjs" et difficulty="normal"',
    category: "basic",
    difficulty: "easy",
  },
  {
    id: "add-memory-with-stack",
    title: "Ajouter mémoire avec stack",
    description:
      "Ajoutez une mémoire en spécifiant le stack technologique et la difficulté.",
    prompt:
      'Ajoute une note dans le contexte "Next.js 16 Patterns" avec title="Server Actions", content="Les Server Actions permettent d\'exécuter du code serveur directement depuis les composants. Elles remplacent les API routes pour les mutations.", stack="nextjs", et difficulty="normal"',
    expected:
      'Claude utilise add_memory avec stack="nextjs" et difficulty="normal"',
    category: "basic",
    difficulty: "normal",
  },
  {
    id: "filter-by-stack",
    title: "Filtrer par stack",
    description: "Listez les mémoires filtrées par stack technologique.",
    prompt:
      'Liste toutes les mémoires avec stack="nextjs" et difficulty="normal"',
    expected:
      "Claude utilise list_memories avec les filtres stack et difficulty",
    category: "basic",
    difficulty: "normal",
  },

  // ===== SEARCH =====
  {
    id: "search",
    title: "Recherche texte intégral",
    description: "Recherchez des informations par mot-clé avec FTS5.",
    prompt: 'Cherche dans les mémoires avec le mot-clé "useMemo"',
    expected: "Claude utilise search et trouve les mémoires correspondantes",
    category: "search",
    difficulty: "normal",
  },
  {
    id: "smart-search",
    title: "Smart Search (recherche hybride)",
    description:
      "Recherche intelligente combinant FTS5 et TF-IDF pour un meilleur scoring.",
    prompt:
      "Utilise smart_search pour trouver des mémoires sur l'optimisation des performances",
    expected: "Claude utilise smart_search avec scoring avancé",
    category: "search",
    difficulty: "normal",
  },
  {
    id: "find-relationships",
    title: "Trouver des relations",
    description: "Découvrez les connexions sémantiques entre vos mémoires.",
    prompt: 'Trouve les relations entre "useMemo" et les performances',
    expected: "Claude utilise find_relationships et montre les connexions",
    category: "search",
    difficulty: "normal",
  },

  // ===== AUTOMATION =====
  {
    id: "auto-analyze",
    title: "Analyse automatique de contexte",
    description: "Laissez Claude analyser et résumer vos contextes.",
    prompt:
      "Utilise auto_analyze_context pour analyser ce que nous avons sur React",
    expected: "Claude utilise auto_analyze_context et résume le contenu",
    category: "automation",
    difficulty: "normal",
  },
  {
    id: "auto-save",
    title: "Sauvegarde intelligente",
    description:
      "Sauvegardez automatiquement avec déduplication et catégorisation.",
    prompt:
      'Utilise auto_save_memory pour stocker : "React 19: use() hook remplace useContext pour lire les promesses dans les composants" avec stack="react19" et difficulty="normal"',
    expected:
      "Claude détecte les doublons, catégorise automatiquement, et stocke avec stack/difficulty",
    category: "automation",
    difficulty: "normal",
  },
  {
    id: "auto-memoize-test",
    title: "Auto-Mémoisation - Test de détection",
    description:
      "Vérifiez que le système détecte et sauvegarde automatiquement le contenu précieux.",
    code: "cd server && bun run test-automemoize",
    expected:
      "Le test affiche les contenus qui seraient auto-sauvegardés (code, solutions, décisions)",
    category: "automation",
    difficulty: "easy",
  },
  {
    id: "auto-memoize-code",
    title: "Auto-Mémoisation - CodeSnippet",
    description: "Testez la détection automatique de snippets de code.",
    prompt:
      'Utilise mgrep pour chercher "useMemo" dans le projet. Le système devrait auto-sauvegarder les résultats contenant du code.',
    expected:
      'Les résultats avec code sont automatiquement sauvegardés (check la console: "[Auto-Memoize] ✅ Auto-saved")',
    category: "automation",
    difficulty: "normal",
  },
  {
    id: "auto-memoize-solution",
    title: "Auto-Mémoisation - Solutions",
    description: "Testez la détection automatique de solutions et résolutions.",
    prompt:
      'Cherche des informations sur "fix bug react" dans les mémoires. Les solutions trouvées devraient être auto-sauvegardées si nouvelles.',
    expected:
      'Les patterns "Solution:" et "fix:" sont détectés et sauvegardés automatiquement',
    category: "automation",
    difficulty: "normal",
  },
  {
    id: "feed-mcp-workflow",
    title: "Alimenter le MCP - Workflow Guidé",
    description:
      "Guide complet pour apprendre au MCP via les outils mgrep et auto_save_memory.",
    prompt:
      'Suis ce workflow pour apprendre au MCP : 1) Utilise mgrep pour chercher "HookResult" dans server/src avec glob="*.ts" et contextLines=2. 2) Ensuite utilise auto_save_memory pour stocker ce que tu as découvert sur l\'interface HookResult avec title="HookResult interface", content="Interface pour les résultats de hooks avec toolName, args, result, startTime, endTime, success, error", et stack="advanced".',
    expected:
      '1) mgrep retourne les définitions de HookResult. 2) auto_save_memory stocke la connaissance. 3) La console affiche "[Auto-Memoize] ✅ Auto-saved: HookResult interface"',
    category: "automation",
    difficulty: "easy",
  },

  // ===== ADVANCED (mgrep + memo) =====
  {
    id: "mgrep-search",
    title: "mgrep - Recherche ultra-rapide",
    description:
      "Utilisez l'outil mgrep pour une recherche 10x plus rapide dans les fichiers.",
    prompt:
      'Utilise mgrep pour chercher "generateId" dans server/src, avec glob="*.ts", contextLines=2, maxResults=10',
    expected:
      "Claude utilise mcp__free-context__mgrep et retourne les résultats en JSON concis",
    category: "advanced",
    difficulty: "normal",
  },
  {
    id: "mgrep-files",
    title: "mgrep_files - Découverte de fichiers",
    description: "Listez rapidement les fichiers correspondants à un pattern.",
    prompt:
      "Utilise mgrep_files pour trouver tous les fichiers *.ts dans le dossier server/src avec maxResults=20",
    expected:
      "Claude utilise mcp__free-context__mgrep_files et liste les fichiers",
    category: "advanced",
    difficulty: "normal",
  },
  {
    id: "mgrep-case-insensitive",
    title: "mgrep - Recherche insensible à la casse",
    description: "Recherchez sans tenir compte de la casse.",
    prompt:
      'Utilise mgrep avec ignoreCase=true pour chercher "react" dans le dossier front/src',
    expected:
      "Claude trouve les correspondances sans distinction majuscule/minuscule",
    category: "advanced",
    difficulty: "normal",
  },
  {
    id: "mgrep-no-context",
    title: "mgrep - Résultats concis (0 contexte)",
    description:
      "Optimisez la consommation de tokens en réduisant le contexte.",
    prompt:
      'Utilise mgrep avec contextLines=0 pour chercher "export" dans server/src',
    expected:
      "Claude retourne uniquement les lignes correspondantes sans contexte",
    category: "advanced",
    difficulty: "normal",
  },

  // ===== UNIT TESTS =====
  {
    id: "run-tests",
    title: "Exécuter les tests unitaires",
    description: "Vérifiez que tous les tests passent (35 tests).",
    code: "cd server\nbun test",
    expected: "Tous les tests passent (35 pass, 0 fail)",
    category: "tests",
    difficulty: "normal",
  },

  // ===== DATABASE VERIFICATION =====
  {
    id: "verify-db",
    title: "Vérification base de données",
    description: "Vérifiez que les données sont bien stockées dans SQLite.",
    code: "cd /home/kev/Documents/lab/brainstorming/free-context/server\nsqlite3 data/free-context.db\n\nSELECT * FROM contexts;\nSELECT * FROM memories;\nSELECT * FROM relationships;",
    expected: "Les données apparaissent dans la base SQLite",
    category: "tests",
    difficulty: "easy",
  },

  // ===== NEXT.JS TESTS =====
  {
    id: "nextjs-easy-server-component",
    title: "Next.js 16 - Server Component de base",
    description: "Créez un Server Component simple qui récupère des données.",
    prompt:
      'Crée un Server Component Next.js 16 qui affiche une liste de utilisateurs récupérée depuis une API. Stocke ce snippet dans free-context avec stack="nextjs" et difficulty="easy".',
    expected:
      "Claude crée un composant avec async function, attend le fetch, et stocke le snippet avec stack/difficulty",
    category: "nextjs",
    difficulty: "easy",
  },
  {
    id: "nextjs-normal-cache-component",
    title: "Next.js 16 - Cache Component avec cacheLife",
    description:
      "Implémentez un Cache Component avec la nouvelle API cacheLife.",
    prompt:
      'Montre-moi comment implémenter un Cache Component dans Next.js 16 avec cacheLife("max") pour mettre en cache des données coûteuses. Stocke cette connaissance.',
    expected:
      "Claude explique les Cache Components avec cacheLife et stocke l'explication",
    category: "nextjs",
    difficulty: "normal",
  },
  {
    id: "nextjs-hard-proxy-migration",
    title: "Next.js 16 - Migration middleware vers proxy.ts",
    description:
      "Migrez un middleware.ts existant vers le nouveau proxy.ts avec params async.",
    prompt:
      'Explique comment migrer ce middleware vers le nouveau proxy.ts de Next.js 16 avec async params: export function middleware(request) { const auth = request.headers.get("authorization"); if (!auth) return new Response("Unauthorized", { status: 401 }); return NextResponse.next(); } Stocke la procédure.',
    expected:
      "Claude fournit le code proxy.ts migré avec export function proxy(request, { params }) et stocke le guide",
    category: "nextjs",
    difficulty: "hard",
  },

  // ===== REACT 19 TESTS =====
  {
    id: "react19-easy-use-hook",
    title: "React 19 - Hook use() de base",
    description: "Utilisez le nouveau hook use() pour lire une promesse.",
    prompt:
      "Montre un exemple simple du hook use() dans React 19 pour lire une promesse dans un composant. Stocke ce snippet.",
    expected:
      "Claude montre const data = use(fetchPromise) et stocke le snippet",
    category: "react19",
    difficulty: "easy",
  },
  {
    id: "react19-normal-useTransition-compiler",
    title: "React 19 - useTransition avec Compiler",
    description:
      "Combinez useTransition avec le React Compiler pour des transitions optimisées.",
    prompt:
      "Explique comment utiliser useTransition avec le React Compiler dans React 19 pour optimiser les mises à jour d'UI. Stocke cette connaissance.",
    expected:
      "Claude explique l'interaction entre useTransition et le Compiler et stocke",
    category: "react19",
    difficulty: "normal",
  },
  {
    id: "react19-hard-compiler-optimistic",
    title: "React 19 - Optimisation avancée avec Compiler + useOptimistic",
    description:
      "Implémentez un pattern avancé avec Compiler, useOptimistic et useActionState.",
    prompt:
      "Crée un exemple complet de formulaire optimiste avec React 19 combinant le React Compiler, useOptimistic et useActionState pour une expérience utilisateur fluide. Stocke ce pattern.",
    expected:
      "Claude fournit un formulaire complet avec les trois hooks et stocke le pattern",
    category: "react19",
    difficulty: "hard",
  },

  // ===== PHP SYMFONY TESTS =====
  {
    id: "symfony-easy-doctrine-entity",
    title: "Symfony 7 - Créer une entité Doctrine",
    description: "Créez une entité Doctrine de base avec attributs PHP 8.",
    prompt:
      'Génère une entité Doctrine Product pour Symfony 7 avec id, name, price en utilisant les attributs PHP 8. Stocke ce snippet avec stack="symfony" et difficulty="easy".',
    expected:
      "Claude génère une classe avec #[ORM\\Entity] et attributs Doctrine, stocke le snippet avec stack/difficulty",
    category: "php-symfony",
    difficulty: "easy",
  },
  {
    id: "symfony-normal-console-command",
    title: "Symfony 7 - Commande Console personnalisée",
    description: "Créez une commande Console avec lazy-loading.",
    prompt:
      "Montre comment créer une commande Console Symfony 7 pour importer des produits avec le tag console.command et lazy-loading. Stocke cette connaissance.",
    expected:
      "Claude montre une classe AsCommand avec attributes et stocke le guide",
    category: "php-symfony",
    difficulty: "normal",
  },
  {
    id: "symfony-hard-messenger-async",
    title: "Symfony 7 - Messenger avec transport async",
    description:
      "Configurez Messenger avec un transport asynchrone et workers.",
    prompt:
      "Configure Messenger dans Symfony 7 avec transport RabbitMQ, des handlers async, et des retry policies pour gérer les échecs. Stocke la configuration complète.",
    expected:
      "Claude fournit config messenger.yaml, handler, et retry policy, stocke tout",
    category: "php-symfony",
    difficulty: "hard",
  },

  // ===== PHP LARAVEL TESTS =====
  {
    id: "laravel-easy-eloquent-model",
    title: "Laravel 12 - Créer un modèle Eloquent",
    description: "Créez un modèle Eloquent avec migrations.",
    prompt:
      'Génère un modèle Eloquent Post pour Laravel 12 avec title, content, published_at et sa migration. Stocke ces snippets avec stack="laravel" et difficulty="easy".',
    expected:
      "Claude génère le modèle et la migration, stocke les deux avec stack/difficulty",
    category: "php-laravel",
    difficulty: "easy",
  },
  {
    id: "laravel-normal-action-pest",
    title: "Laravel 12 - Action class avec Pest",
    description: "Créez une Action class avec tests Pest.",
    prompt:
      "Crée une Action class CreateUser pour Laravel 12 avec validation, et ses tests Pest. Stocke ce pattern.",
    expected: "Claude crée l'Action avec invokable, les tests Pest, et stocke",
    category: "php-laravel",
    difficulty: "normal",
  },
  {
    id: "laravel-hard-jsonapi-resource",
    title: "Laravel 12 - Ressource JSON:API avec relations",
    description: "Implémentez une ressource JSON:API complète avec relations.",
    prompt:
      "Crée une ressource JSON:API pour Laravel 12 avec Author et Post, incluant les relations, les links, et le formattage des métadonnées selon json:api. Stocke cette implémentation.",
    expected:
      "Claude fournit JsonApiResource, ResourceCollection, relationships, et stocke",
    category: "php-laravel",
    difficulty: "hard",
  },

  // ===== PHP API PLATFORM TESTS =====
  {
    id: "apiplatform-easy-entity-resource",
    title: "API Platform - Entity APIResource basique",
    description: "Exposez une entité Doctrine via API Platform.",
    prompt:
      "Crée une entité Book Doctrine avec ApiResource annotation pour l'exposer via API Platform. Stocke ce snippet.",
    expected: "Claude crée l'entité avec #[ApiResource] et stocke",
    category: "php-api-platform",
    difficulty: "easy",
  },
  {
    id: "apiplatform-normal-filter-pagination",
    title: "API Platform - Filtres et pagination",
    description: "Ajoutez des filtres personnalisés et la pagination.",
    prompt:
      "Ajoute des filtres SearchFilter, DateFilter et une pagination customisée à l'entité Book dans API Platform. Stocke cette configuration.",
    expected: "Claude configure les filtres et la pagination, stocke la config",
    category: "php-api-platform",
    difficulty: "normal",
  },
  {
    id: "apiplatform-hard-custom-provider-validator",
    title: "API Platform - Provider et Validator custom",
    description: "Créez un custom item provider et un validator.",
    prompt:
      "Crée un custom ItemProvider pour charger les entités depuis Elasticsearch et un Validator custom pour API Platform avec DTOs. Stocke cette implémentation.",
    expected: "Claude fournit le provider, le validator, les DTOs et stocke",
    category: "php-api-platform",
    difficulty: "hard",
  },

  // ===== VUE.JS TESTS =====
  {
    id: "vuejs-easy-script-setup",
    title: "Vue.js 3.5 - Composition API avec script setup",
    description: "Créez un composant avec script setup syntax.",
    prompt:
      "Crée un composant Vue 3.5 avec <script setup> qui utilise ref et computed. Stocke ce snippet.",
    expected:
      "Claude crée un composant avec script setup, ref, computed, stocke",
    category: "vuejs",
    difficulty: "easy",
  },
  {
    id: "vuejs-normal-watcheffect-composable",
    title: "Vue.js 3.5 - Composable avec watchEffect",
    description: "Créez un composable réactif avec watchEffect.",
    prompt:
      "Crée un composable useLocalStorage pour Vue 3.5 avec watchEffect qui sync une ref avec localStorage. Stocke ce composable.",
    expected: "Claude crée le composable avec watchEffect et stocke",
    category: "vuejs",
    difficulty: "normal",
  },
  {
    id: "vuejs-hard-custom-composable-suspense",
    title: "Vue.js 3.5 - Composable async avec Suspense",
    description: "Créez un composable complexe avec async/await et Suspense.",
    prompt:
      "Crée un composable useAsyncData pour Vue 3.5 qui gère le chargement async, les erreurs, et fonctionne avec Suspense boundaries. Stocke ce pattern avancé.",
    expected:
      "Claude crée le composable avec gestion d'état, Suspense, et stocke",
    category: "vuejs",
    difficulty: "hard",
  },

  // ===== DEVOPS TESTS =====
  {
    id: "devops-easy-dockerfile",
    title: "DevOps - Dockerfile multi-stage optimisé",
    description: "Créez un Dockerfile multi-stage pour une app Node.js.",
    prompt:
      "Crée un Dockerfile multi-stage optimisé pour une app Node.js avec bun, cache layers, et non-root user. Stocke ce Dockerfile.",
    expected:
      "Claude crée un Dockerfile multi-stage avec best practices et stocke",
    category: "devops",
    difficulty: "easy",
  },
  {
    id: "devops-normal-github-actions-cicd",
    title: "DevOps - GitHub Actions CI/CD complet",
    description: "Créez un workflow CI/CD avec tests, build et deploy.",
    prompt:
      "Crée un workflow GitHub Actions pour une app Next.js avec lint, tests, build Docker, et deploy sur Vercel. Stocke ce workflow.",
    expected: "Claude crée le workflow .github/workflows/ci.yml et stocke",
    category: "devops",
    difficulty: "normal",
  },
  {
    id: "devops-hard-kubernetes-hpa-ingress",
    title: "DevOps - Kubernetes avec HPA et Ingress",
    description: "Déployez une app avec HPA, Ingress et secrets management.",
    prompt:
      "Crée des manifests Kubernetes pour une app avec Deployment, Service, HorizontalPodAutoscaler, Ingress NGINX, et Secret management avec external-secrets. Stocke cette configuration.",
    expected:
      "Claude fournit tous les manifests K8s et stocke la configuration",
    category: "devops",
    difficulty: "hard",
  },
];

export const categoryConfig: Record<
  TestCategory,
  {
    title: string;
    icon: typeof LightbulbIcon;
    color: string;
    borderColor: string;
  }
> = {
  basic: {
    title: "Fonctionnalités de Base",
    icon: LightbulbIcon,
    color: "text-blue-500",
    borderColor: "border-blue-500/20",
  },
  search: {
    title: "Recherche & Indexation",
    icon: SearchIcon,
    color: "text-purple-500",
    borderColor: "border-purple-500/20",
  },
  automation: {
    title: "Automation & IA",
    icon: BrainIcon,
    color: "text-pink-500",
    borderColor: "border-pink-500/20",
  },
  advanced: {
    title: "Fonctionnalités Avancées",
    icon: ZapIcon,
    color: "text-amber-500",
    borderColor: "border-amber-500/20",
  },
  tests: {
    title: "Tests & Vérification",
    icon: TestTube2Icon,
    color: "text-green-500",
    borderColor: "border-green-500/20",
  },
  nextjs: {
    title: "Next.js 16",
    icon: RocketIcon,
    color: "text-gray-800 dark:text-white",
    borderColor: "border-gray-800/20 dark:border-white/20",
  },
  react19: {
    title: "React 19",
    icon: CpuIcon,
    color: "text-cyan-500",
    borderColor: "border-cyan-500/20",
  },
  "php-symfony": {
    title: "Symfony 7",
    icon: DatabaseIcon,
    color: "text-gray-700 dark:text-gray-300",
    borderColor: "border-gray-700/20 dark:border-gray-300/20",
  },
  "php-laravel": {
    title: "Laravel 12",
    icon: BugIcon,
    color: "text-red-500",
    borderColor: "border-red-500/20",
  },
  "php-api-platform": {
    title: "API Platform",
    icon: TerminalIcon,
    color: "text-green-600",
    borderColor: "border-green-600/20",
  },
  vuejs: {
    title: "Vue.js 3.5",
    icon: CpuIcon,
    color: "text-emerald-500",
    borderColor: "border-emerald-500/20",
  },
  devops: {
    title: "DevOps & Infrastructure",
    icon: RocketIcon,
    color: "text-orange-500",
    borderColor: "border-orange-500/20",
  },
};
