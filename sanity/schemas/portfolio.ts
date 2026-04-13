import type { Rule } from 'sanity'

const portfolio = {
  name: 'portfolio',
  title: 'Работа в портфолио',
  type: 'document',
  fields: [
    { name: 'title', title: 'Название', type: 'string', validation: (rule: Rule) => rule.required() },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
      validation: (rule: Rule) => rule.required(),
    },
    {
      name: 'category',
      title: 'Категория',
      type: 'string',
      options: {
        list: [
          { title: 'Полиграфия', value: 'Полиграфия' },
          { title: 'Наружная реклама', value: 'Наружная реклама' },
          { title: 'Фасады', value: 'Фасады' },
        ],
      },
    },
    { name: 'description', title: 'Краткое описание', type: 'text', rows: 2 },
    { name: 'image', title: 'Изображение', type: 'image', options: { hotspot: true } },
    { name: 'publishedAt', title: 'Дата', type: 'datetime' },
  ],
}

export default portfolio
