const isGithub = process.env.GITHUB == 'github';
const base = isGithub ? '/grammar-club/' : '/';

module.exports = {
  head: [
    ['meta', { name: 'viewport', content: 'width=device-width,initial-scale=1,viewport-fit=cover' }],
    ['meta', { name: 'theme-color', content: '#f5f5f7' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'default' }],
    ['link', { rel: 'manifest', href: base + 'manifest.webmanifest' }]
  ],
  plugins: [
    [
      'google-analytics-4',
      {
        gtag: 'G-423T4HSGBR'
      }
    ]
  ],
  base: base,
  dest: isGithub ? 'docs/.vuepress/github' : 'docs/.vuepress/dist',
  title: '语法俱乐部',
  themeConfig: {
    repo: 'ChenHongzhou-sz/grammar-club',
    displayAllHeaders: true,
    smoothScroll: true,
    sidebar: {
      '/content/': [
        ['Preface', '序'],
        'Introduction',
        'Contents',
        {
          title: '第一篇 初级句型--简单句',
          collapsable: false,
          children: [
            'Chapter01',
            'Chapter02',
            'Chapter03',
            'Chapter04',
            'Chapter05',
            'Chapter06',
            'Chapter07',
            'Chapter08',
            'Chapter09',
            'Chapter10',
            'Chapter11'
          ]
        },
        {
          title: '第二篇 中级句型--复句',
          collapsable: false,
          children: ['Chapter12', 'Chapter13', 'Chapter14', 'Chapter15']
        },
        {
          title: '第三篇 高级句型--简化从句',
          collapsable: false,
          children: ['Chapter16', 'Chapter17', 'Chapter18', 'Chapter19', 'Chapter20', 'Chapter21', 'Chapter22']
        }
      ]
    },
    nav: [
      { text: '首页', link: '/' },
      { text: '目录', link: '/content/Contents' },
      { text: '开始', link: '/content/Chapter01' }
    ],
    lastUpdated: '最后更新'
  }
};
