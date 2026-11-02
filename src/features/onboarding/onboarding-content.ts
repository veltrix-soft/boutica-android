import type { IconName } from '../../components/ui';

export type OnboardingStep = {
  id: number;
  title: string;
  subtitle: string;
  badge: string;
  icon: IconName;
  iconColor: string;
  iconBackground: string;
  visualTitle: string;
  visualCaption: string;
  points: {
    title: string;
    description: string;
  }[];
};

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 1,
    title: 'Gérez vos produits, variantes et stocks avec rigueur',
    subtitle:
      'Organisez votre catalogue et gardez une vision précise de chaque article disponible.',
    badge: 'Catalogue & stocks',
    icon: 'cube-outline',
    iconColor: '#9A050E',
    iconBackground: '#FCEAEC',
    visualTitle: 'Votre inventaire',
    visualCaption: 'Produits, variantes et références SKU',
    points: [
      {
        title: 'Produits, variantes et références SKU',
        description: 'Regroupez vos formats et références dans un catalogue clair.',
      },
      {
        title: 'Alertes automatiques de stock bas',
        description: 'Repérez les articles à réapprovisionner avant la rupture.',
      },
      {
        title: 'Ajustements d’inventaire tracés',
        description: 'Consignez les corrections de stock et leur motif.',
      },
    ],
  },
  {
    id: 2,
    title: 'Enregistrez vos ventes et encaissez en quelques secondes',
    subtitle:
      'Une caisse tactile conçue pour accélérer le service, sans raccourcis clavier.',
    badge: 'Point de vente',
    icon: 'cart-outline',
    iconColor: '#16804A',
    iconBackground: '#EAF6EF',
    visualTitle: 'Prêt à encaisser',
    visualCaption: 'Articles, totaux et tickets au même endroit',
    points: [
      {
        title: 'Recherche rapide des articles',
        description: 'Retrouvez facilement un produit dans votre catalogue.',
      },
      {
        title: 'Ventes, montants et remises',
        description: 'Enregistrez chaque vente avec un total calculé clairement.',
      },
      {
        title: 'Tickets prêts à imprimer',
        description: 'Consultez le détail de vos ventes et éditez leurs tickets.',
      },
    ],
  },
  {
    id: 3,
    title: 'Suivez vos achats, vos dépenses et vos rapports certifiés',
    subtitle:
      'Pilotez vos opérations et consultez les indicateurs essentiels à votre activité.',
    badge: 'Pilotage & comptabilité',
    icon: 'bar-chart-outline',
    iconColor: '#3478C8',
    iconBackground: '#EAF2FB',
    visualTitle: 'Votre activité',
    visualCaption: 'Achats, dépenses et performances commerciales',
    points: [
      {
        title: 'Réception des commandes fournisseurs',
        description: 'Enregistrez vos achats et mettez à jour les stocks.',
      },
      {
        title: 'Gestion des dépenses',
        description: 'Suivez les frais de votre entreprise et leur impact.',
      },
      {
        title: 'Rapports et exports',
        description: 'Consultez vos performances et exportez vos rapports.',
      },
    ],
  },
];
