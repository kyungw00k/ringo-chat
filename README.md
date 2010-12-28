Ringo-Chat
===================

Ringo-Chat
Ringo-Chat is a simple, scalable web-based chat server built on Ringo.js + AppengineJS.
[https://github.com/scottgonzalez/node-chat](Just the clone version of NodeChat)

Quick start
===========

Download the [Google App Engine Java SDK](http://code.google.com/appengine/downloads.html) and make sure that the bin directory of the SDK (/path/to/appengine-java-sdk/bin) is in the path. You can start the example with:
    
    $ cd ringo-chat
    $ dev_appserver.sh . 

and browse to http://localhost:8080/


Deploy to App Engine
====================

To deploy to App Engine:

    $ cd ringo-chat
    $ appcfg.sh ringo-chat .

Please note that the example is configured for debuging: it reloads the app per request, compilation is dissabled, debuging middleware is inserted in the request pipeline. You should use a production configuration for deployment.


Directory structure
===================

The directory structure is fully customizable. In this example, the directory structure is based on [Nitro](http://www.github.com/gmosx/nitro) conventions:

    /src - the web app source code.
    /war - the web app public directory, static files, etc come here.
    /war/WEB-INF - servlet stuff, generated automatically (you can ignore this dir) 
    /war/WEB-INF/app - RingoJS App related
    /war/WEB-INF/app/public - static files
    /war/WEB-INF/app/skins - template files
    /war/WEB-INF/packages - commonjs packages.
    /war/WEB-INF/lib - java .jar files needed for your app (you can ignore this dir)


Support
=======

For questions regarding this example or appenginejs please post to the mailing list: [http://groups.google.com/group/appenginejs](http://groups.google.com/group/appenginejs)
