# Projet de Test - Free Context MCP

C'est un petit projet React pour tester le MCP Free Context de manière concrète.

## Scénario de Test

Le but est de montrer comment Free Context MCP aide à :
1. **Créer un contexte** pour ce projet spécifique
2. **Ajouter des mémoires** sur les décisions techniques
3. **Retrouver l'information** quand on en a besoin
4. **Voir les relations** entre différentes mémoires

## Comment tester

### Étape 1 : Créer un contexte pour ce projet

Dans Claude Code CLI (après redémarrage), tapez :

```
Crée un contexte "Test React Project" avec les tags react, hooks, performance
```

Claude devrait utiliser l'outil `create_context`.

### Étape 2 : Ajouter des mémoires techniques

```
Ajoute une note : "Pour éviter les re-renders inutiles, utiliser useMemo pour les calculs coûteux et useCallback pour les fonctions passées aux enfants"
```

```
Ajoute un snippet : "Exemple de custom hook pour fetch de données"
```

```
Ajoute une référence : "React Hook Form - meilleure lib pour gérer les formulaires complexes"
```

### Étape 3 : Rechercher l'information plus tard

```
Qu'est-ce qu'on a noté sur les performances ?
```

Claude devrait utiliser `search` pour trouver les mémoires pertinentes.

### Étape 4 : Créer une relation

```
Trouve les connexions entre useMemo et les performances
```

Claude devrait utiliser `find_relationships`.

## Résultat attendu

À la fin, vous devriez avoir :
- ✅ Un contexte "Test React Project" créé
- ✅ 3 mémoires de types différents (note, snippet, reference)
- ✅ Une recherche qui trouve les bonnes mémoires
- ✅ Des relations établies entre les concepts

## Vérification

```bash
# Vérifier que les données sont dans la DB
sqlite3 /home/kev/Documents/lab/brainstorming/free-context/server/free-context.db

SELECT * FROM contexts;
SELECT * FROM memories;
SELECT * FROM relationships;
```
