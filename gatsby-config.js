module.exports = {
  siteMetadata: {
    title: `Diogo Torres Correia`,
    shortTitle: `Diogo Correia`,
    description: `Hey, I'm Diogo Torres Correia from Portugal. I love programming, running, taking photos and learning new things!`,
    author: `@diogotc2002`,
  },
  plugins: [
    `gatsby-plugin-top-layout`,
    `gatsby-plugin-react-helmet`,
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `images`,
        path: `${__dirname}/src/images`,
      },
    },
    `gatsby-transformer-sharp`,
    `gatsby-plugin-sharp`,
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `Diogo Torres Correia`,
        short_name: `Diogo Correia`,
        start_url: `/`,
        background_color: `#1E88E5`,
        theme_color: `#1E88E5`,
        display: `minimal-ui`,
        icon: `src/images/gatsby-icon.png`, // This path is relative to the root of the site.
      },
    },
    // this (optional) plugin enables Progressive Web App + Offline functionality
    // To learn more, visit: https://gatsby.dev/offline
    `gatsby-plugin-offline`,
    {
      resolve: 'gatsby-plugin-material-ui',
      options: {
        stylesProvider: {
          injectFirst: true,
        },
      },
    },
  ],
};
