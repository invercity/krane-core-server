/**
 * Module dependencies.
 */
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
// const session = require('express-session');
// const MongoStore = require('connect-mongo')(session);
// const favicon = require('serve-favicon');
const compress = require('compression');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const consolidate = require('consolidate');

const config = require('config');

/**
 * Initialize local variables
 */
module.exports.initLocalVariables = (app) => {
  // Setting application local variables
  app.locals.title = config.app.title;
  app.locals.description = config.app.description;
  if (config.secure && config.secure.ssl === true) {
    app.locals.secure = config.secure.ssl;
  }
  app.locals.keywords = config.app.keywords;
  app.locals.googleAnalyticsTrackingID = config.app.googleAnalyticsTrackingID;
  app.locals.facebookAppId = config.facebook.clientID;
  app.locals.jsFiles = config.files.client.js;
  app.locals.cssFiles = config.files.client.css;
  app.locals.livereload = config.livereload;
  app.locals.logo = config.logo;
  app.locals.favicon = config.favicon;

  // Passing the request url to environment locals
  app.use((req, res, next) => {
    res.locals.host = `${req.protocol}://${req.hostname}`;
    res.locals.url = `${req.protocol}://${req.headers.host}${req.originalUrl}`;
    next();
  });
};

/**
 * Initialize application middleware
 */
module.exports.initMiddleware = (app) => {
  // Showing stack errors
  app.set('showStackError', true);

  // Enable jsonp
  app.enable('jsonp callback');

  // Should be placed before express.static
  app.use(compress({
    filter: (req, res) => (/json|text|javascript|css|font|svg/).test(res.getHeader('Content-Type')),
    level: 9
  }));

  // TODO: fill favicon
  // Initialize favicon middleware
  // app.use(favicon(config.favicon));

  // Environment dependent middleware
  if (process.env.NODE_ENV === 'development') {
    // Enable logger (morgan)
    app.use(morgan('dev'));

    // Disable views cache
    app.set('view cache', false);
    // TODO: change to flag
  } else if (process.env.NODE_ENV === 'production') {
    app.locals.cache = 'memory';
  }

  // Request body parsing middleware should be above methodOverride
  app.use(bodyParser.urlencoded({
    extended: true
  }));
  app.use(bodyParser.json());
  app.use(methodOverride());

  app.use(cookieParser());
};

/**
 * Configure view engine
 */
module.exports.initViewEngine = (app) => {
  // Set swig as the template engine
  app.engine('server.view.html', consolidate[config.templateEngine]);

  // Set views path and view engine
  app.set('view engine', 'server.view.html');
  app.set('views', './');
};

/**
 * Configure Express session
 */
module.exports.initSession = () => {
  // Express MongoDB session storage
  /* app.use(session({
    saveUninitialized: true,
    resave: true,
    secret: config.sessionSecret,
    cookie: {
      maxAge: config.sessionCookie.maxAge,
      httpOnly: config.sessionCookie.httpOnly,
      secure: config.sessionCookie.secure && config.secure.ssl
    },
    key: config.sessionKey,
    store: new MongoStore({
      mongooseConnection: db.connection,
      collection: config.sessionCollection
    })
  })); */
};

/**
 * Invoke modules server configuration
 */
module.exports.initModulesConfiguration = (app, db) => {
  config.files.server.configs.forEach(configPath => require(path.resolve(configPath))(app, db));
};

/**
 * Configure Helmet headers configuration
 */
module.exports.initHelmetHeaders = (app) => {
  // Use helmet to secure Express headers
  const SIX_MONTHS = 15778476000;
  app.use(helmet.frameguard());
  app.use(helmet.xssFilter());
  app.use(helmet.noSniff());
  app.use(helmet.ieNoOpen());
  app.use(helmet.hsts({
    maxAge: SIX_MONTHS,
    includeSubdomains: true,
    force: true
  }));
  app.disable('x-powered-by');
};

/**
 * Configure the modules static routes
 */
module.exports.initModulesClientRoutes = (app) => {
  // Setting the app router and static folder
  app.use('/', express.static(path.resolve('./public')));

  // app.use('/sub/:subdomain/', express.static(path.resolve('./public')));

  // Globbing static routing
  config.folders.client.forEach((staticPath) => {
    app.use(staticPath, express.static(path.resolve(`./${staticPath}`)));
    // app.use('sub/:subdomain/' + staticPath, express.static(path.resolve('./' + staticPath)));
  });
};

/**
 * Configure the modules ACL policies
 */
module.exports.initModulesServerPolicies = () => {
  // Globbing policy files
  config.files.server.policies.forEach(policyPath => require(path.resolve(policyPath)).invokeRolesPolicies());
};

/**
 * Configure the modules server routes
 */
module.exports.initModulesServerRoutes = (app) => {
  // Globbing routing files
  config.files.server.routes.forEach((routePath) => {
    const router = express.Router();
    app.use('/', router);
    require(path.resolve(routePath))(router);
  });
};

/**
 * Configure error handling
 */
module.exports.initErrorRoutes = (app) => {
  app.use((err, req, res, next) => {
    // If the error object doesn't exists
    if (!err) {
      return next();
    }

    // TODO: logger
    /* eslint-disable-next-line no-console */
    console.error(err.stack);

    // Redirect to error page
    return res.redirect('/server-error');
  });
};

/**
 * Initialize the Express application
 */
module.exports.init = () => {
  // Initialize express app
  const app = express();

  // Initialize local variables
  // this.initLocalVariables(app);

  // Initialize Express middleware
  this.initMiddleware(app);

  // Initialize Express view engine
  // this.initViewEngine(app);

  // Initialize Express session
  // this.initSession(app, db);

  // Initialize Modules configuration
  // this.initModulesConfiguration(app);

  // Initialize Helmet security headers
  // this.initHelmetHeaders(app);

  // Initialize modules static client routes
  // this.initModulesClientRoutes(app);

  // Initialize modules server authorization policies
  // this.initModulesServerPolicies(app);

  // Initialize modules server routes
  // this.initModulesServerRoutes(app);

  // Initialize error routes
  this.initErrorRoutes(app);

  return app;
};
