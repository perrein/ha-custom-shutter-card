# Custom Shutter Card

Une carte personnalisée pour Home Assistant offrant une visualisation interactive des volets roulants avec des capacités de positionnement par glisser-déposer.

## Caractéristiques

- Représentation visuelle d'un volet roulant
- Interface interactive permettant un positionnement direct avec la souris ou le toucher
- Design moderne compatible avec Home Assistant
- Retour visuel montrant la position actuelle du volet
- Design responsive pour différentes tailles d'écran
- Positionnement des volets par glisser-déposer
- Affichage du pourcentage de position actuelle du volet
- Intégration avec les entités cover de Home Assistant
- Représentation visuelle de l'état du volet (ouvert/fermé/partiel)
- Panneau d'informations supplémentaires montrant les détails du volet

## Installation

1. Ajoutez cette carte à HACS et installez-la
2. Ajoutez la référence à la ressource dans votre configuration Lovelace
3. Ajoutez la carte à votre tableau de bord

## Configuration

```yaml
type: custom:custom-shutter-card
entity: cover.your_shutter_entity
```

## Options de configuration

| Nom | Type | Défaut | Description |
|-----|------|--------|-------------|
| type | string | **Obligatoire** | `custom:custom-shutter-card` |
| entity | string | **Obligatoire** | L'entity_id d'une entité cover |
| title | string | *nom de l'entité* | Titre personnalisé pour la carte |

## Utilisation

- **Glisser-déposer** : Cliquez et faites glisser directement sur le volet pour définir la position
- **Boutons** : Utilisez les boutons pour ouvrir/fermer complètement ou ajuster par incréments de 10%
- **Curseur** : Utilisez le curseur pour un réglage précis