module.exports = {
  title: 'OpcpFlow',
  tagline: 'Open DAG Workflow Framework',
  url: 'https://github.com/opcpflow/opcpflow',
  baseUrl: '/',
  onBrokenLinks: 'warn',
  organizationName: 'opcpflow',
  projectName: 'docs',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/opcpflow/opcpflow/edit/main/apps/docs/',
          routeBasePath: '/',
        },
        blog: false,
        theme: {},
      },
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'OpcpFlow',
      items: [
        { type: 'doc', docId: 'getting-started/quickstart', position: 'left', label: 'Docs' },
        { href: 'https://github.com/opcpflow/opcpflow', label: 'GitHub', position: 'right' },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Quickstart', to: '/getting-started/quickstart' },
            { label: 'Installation', to: '/getting-started/installation' },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'GitHub', href: 'https://github.com/opcpflow/opcpflow' },
          ],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} OpcpFlow. Built with Docusaurus.`,
    },
  },
};
