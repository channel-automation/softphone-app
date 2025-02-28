# Lessons Learned

## .NET Version Compatibility

### Problem
The application was originally built with .NET 6.0, but the local development environment had .NET 9.0 installed without the .NET 6.0 runtime.

### Solution
1. Updated the project to target .NET 8.0 by modifying the `Softphone.Frontend.csproj` file:
   - Changed `<TargetFramework>net6.0</TargetFramework>` to `<TargetFramework>net8.0</TargetFramework>`
   - Updated package references to use .NET 8.0 compatible versions:
     - `Microsoft.AspNetCore.Mvc.NewtonsoftJson` from 6.0.36 to 8.0.0
     - `Microsoft.AspNetCore.Mvc.Razor.RuntimeCompilation` from 6.0.36 to 8.0.0

2. Used the specific .NET 8.0 runtime path to run the application:
   - `/opt/homebrew/Cellar/dotnet@8/8.0.13/bin/dotnet run --project Softphone.Frontend`

### Best Practices
- When working with .NET applications, ensure the correct runtime version is installed
- Consider using global.json to specify the exact SDK version for the project
- For deployment, ensure the target environment has the correct .NET runtime installed

## Project Architecture Migration

### Changes
The project has been migrated from Razor Pages to MVC architecture:
- Removed Pages directory and added Controllers and Views directories
- Added proper controller classes for different sections of the application
- Moved UI components to appropriate View files
- Changed UI theme to Admin-LTE for a more modern look

### Benefits
- Better separation of concerns with the MVC pattern
- Improved code organization
- Enhanced UI with the Admin-LTE theme
- Better maintainability with smaller, focused files

## HTTPS Development Certificate

### Problem
When running the application locally, browsers may show certificate warnings or refuse to connect to the HTTPS endpoint (https://localhost:7245) because the development certificate is not trusted.

### Solution
Trust the ASP.NET Core development certificate using the following command:
```
dotnet dev-certs https --trust
```

This command adds the development certificate to your system's trusted certificates, allowing browsers to connect to the HTTPS endpoint without warnings.

### Notes
- The HTTP endpoint (http://localhost:5252) redirects to the HTTPS endpoint (https://localhost:7245) by default
- This redirection is a security feature of ASP.NET Core applications
- If you still have issues after trusting the certificate, try:
  - Clearing your browser cache
  - Using a different browser
  - Checking browser security settings

## Running the Application Locally

To run the application locally:
1. Ensure the correct .NET runtime is installed (in this case, .NET 8.0)
2. Navigate to the project directory
3. Run `dotnet restore` to restore dependencies
4. Run `dotnet run` to start the application
5. Trust the development certificate with `dotnet dev-certs https --trust`
6. Access the application at https://localhost:7245 or http://localhost:5252 

## Lessons Learned - Softphone Integration

### Backend Development
1. **Node.js Express Backend**: Successfully created a Node.js Express backend for handling Twilio voice calls.
   - Used Express.js for the API server
   - Implemented CORS to allow cross-origin requests from the frontend
   - Created health check endpoints for Railway deployment

2. **Twilio Integration**: Implemented Twilio voice functionality:
   - Token generation for client authentication
   - Inbound call handling with TwiML
   - Outbound call handling with proper call routing
   - Call recording and status tracking
   - Webhook configuration for Twilio services

3. **Environment Configuration**: Used dotenv for environment variable management:
   - Separated development and production configurations
   - Secured sensitive Twilio credentials
   - Configured allowed origins for CORS

4. **Railway Deployment**: Set up configuration for Railway deployment:
   - Created railway.toml for service configuration
   - Added nixpacks.toml for build process
   - Configured health checks and restart policies
   - Set up proper port handling for production

### Frontend Integration
1. **ASP.NET Core Integration**: Successfully integrated the Node.js backend with ASP.NET Core frontend:
   - Updated JavaScript to communicate with the backend API
   - Configured CORS on both ends to allow secure communication
   - Used environment-aware URL configuration for local vs production

2. **Twilio Voice SDK**: Properly integrated Twilio Voice SDK:
   - Fixed import issues by switching from ES modules to script tags
   - Initialized Twilio Device with token from backend
   - Set up proper event handlers for call states
   - Implemented UI updates based on call status

3. **UI Components**: Enhanced the dialer UI with call controls:
   - Added call status indicators
   - Implemented incoming call UI with accept/reject buttons
   - Added in-call controls (mute, hang up)
   - Improved error handling and user feedback

### Common Issues and Solutions
1. **CORS Issues**: Fixed CORS issues by:
   - Configuring proper allowed origins on the backend
   - Setting appropriate headers for preflight requests
   - Using credentials mode for authenticated requests

2. **Module Import Issues**: Resolved module import problems by:
   - Switching from ES modules to script tags for browser compatibility
   - Using the global Twilio object instead of importing modules
   - Ensuring proper script loading order in the HTML

3. **Environment Configuration**: Managed different environments by:
   - Using hostname detection to set appropriate backend URLs
   - Creating fallback values for missing environment variables
   - Documenting required configuration in README files

4. **Deployment Preparation**: Prepared for Railway deployment by:
   - Creating proper configuration files
   - Setting up health check endpoints
   - Configuring proper port handling
   - Documenting deployment steps

### Next Steps
1. Complete the deployment to Railway for both frontend and backend
2. Update environment variables with actual Twilio credentials
3. Configure webhook URLs in Twilio dashboard to point to the deployed backend
4. Test the full application in production environment
5. Implement additional features like call history and analytics 

## Railway Deployment Lessons

### Deployment Configuration

1. **Backend Configuration**: 
   - Created `railway.toml` for service configuration
   - Added `nixpacks.toml` for build process
   - Set up health check endpoint for monitoring
   - Configured proper port handling for production

2. **Frontend Configuration**:
   - Created `railway.toml` for ASP.NET Core deployment
   - Added `Dockerfile` for containerization
   - Implemented health check endpoint
   - Set up proper port handling for production

### URL Management

When deploying to Railway, it's crucial to update URLs in multiple places:

1. **Backend Environment Variables**:
   - `WEBHOOK_BASE_URL` must be updated to the deployed backend URL
   - `ALLOWED_ORIGINS` must include the deployed frontend URL

2. **Frontend JavaScript**:
   - The `backendUrl` variable in `calling.js` must be updated to the deployed backend URL
   - Used hostname detection to automatically switch between local and production URLs

3. **Twilio Configuration**:
   - Webhook URLs in Twilio must be updated to point to the deployed backend
   - This includes Voice Request URLs and Status Callback URLs

### Environment Variables

1. **Sensitive Information**:
   - Twilio credentials should be stored as environment variables in Railway
   - Never commit sensitive information to the repository

2. **Configuration Variables**:
   - URLs and other configuration should be stored as environment variables
   - This allows for easy updates without code changes

### Deployment Process

1. **GitHub Integration**:
   - Railway can deploy directly from a GitHub repository
   - Changes pushed to GitHub trigger automatic redeployment

2. **Directory Selection**:
   - When deploying a monorepo, specify the directory for each service
   - Backend: `backend/new-backend`
   - Frontend: `Softphone.Frontend`

3. **Health Checks**:
   - Implemented health check endpoints for both backend and frontend
   - Railway uses these to monitor application health

4. **Logs and Monitoring**:
   - Railway provides logs for troubleshooting
   - Check logs immediately after deployment to catch any issues

### Best Practices

1. **Test Locally First**:
   - Always test changes locally before deploying
   - Use environment variables to simulate production environment

2. **Incremental Deployment**:
   - Deploy backend first, then frontend
   - Update URLs and test after each deployment

3. **Rollback Plan**:
   - Have a plan for rolling back changes if needed
   - Railway allows reverting to previous deployments

4. **Documentation**:
   - Document the deployment process
   - Include URLs, environment variables, and troubleshooting steps 

## Handling ViewBag Data in ASP.NET Core MVC

### Problem
The application was throwing a NullReferenceException in NavbarPartial.cshtml because `_user` was null. This occurred because not all controllers were setting the `ViewBag.User` property consistently.

### Solution
1. Created a `BaseController` class that all controllers inherit from:
   ```csharp
   public class BaseController : Controller
   {
       private readonly IUserService _userService;

       public BaseController(IUserService userService)
       {
           _userService = userService;
       }

       public override async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
       {
           // Set the user in ViewBag if the user is authenticated
           if (User?.Identity?.IsAuthenticated == true)
           {
               try
               {
                   var user = await _userService.FindByUsername(User.Identity.Name);
                   ViewBag.User = user;
               }
               catch (Exception)
               {
                   // If there's an error getting the user, create a default one
                   ViewBag.User = new UserBO
                   {
                       FirstName = "Guest",
                       LastName = "User",
                       Username = "guest"
                   };
               }
           }
           else
           {
               // Set a default user for non-authenticated requests
               ViewBag.User = new UserBO
               {
                   FirstName = "Guest",
                   LastName = "User",
                   Username = "guest"
               };
           }

           await base.OnActionExecutionAsync(context, next);
       }
   }
   ```

2. Updated all controllers to inherit from `BaseController` instead of `Controller`:
   ```csharp
   public class HomeController : BaseController
   {
       public HomeController(IUserService userService) : base(userService)
       {
           // ...
       }
   }
   ```

3. Modified the NavbarPartial.cshtml to handle the case when ViewBag.User is null:
   ```csharp
   @{
       var _user = ViewBag.User as Softphone.Frontend.Models.UserBO ?? new Softphone.Frontend.Models.UserBO
       {
           FirstName = "Guest",
           LastName = "User",
           Username = "guest"
       };
   }
   ```

### Best Practices
1. **Use a Base Controller**: Create a base controller for common functionality like setting ViewBag properties.
2. **Defensive Programming**: Always check for null values in views and provide fallbacks.
3. **Consistent Data Access**: Use a consistent approach to accessing user data across all controllers.
4. **Error Handling**: Add try-catch blocks to handle exceptions when retrieving user data.
5. **Default Values**: Provide default values for properties that might be null. 

## CORS Configuration for Railway Deployment

### Problem
When deploying to Railway, the backend needs to be configured to allow cross-origin requests from specific origins, including local development environments.

### Solution
The backend server is configured to read allowed origins from the `ALLOWED_ORIGINS` environment variable. This variable should be set in the Railway dashboard for the backend service.

1. In the Railway dashboard, navigate to your backend service
2. Go to the "Variables" tab
3. Add or update the `ALLOWED_ORIGINS` variable with a comma-separated list of allowed origins:
   ```
   ALLOWED_ORIGINS=http://localhost:5252,https://localhost:7245,https://your-frontend-url.up.railway.app
   ```

4. Make sure to include:
   - Local development URLs (http://localhost:5252, https://localhost:7245)
   - The deployed frontend URL (https://your-frontend-url.up.railway.app)
   - Any other domains that need to access the backend

### How It Works
The backend server uses the following code to handle CORS:

```javascript
// Get allowed origins from environment variable or use defaults
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5252', 'https://localhost:7245'];

// Configure CORS with specific options
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
```

This configuration:
1. Reads the `ALLOWED_ORIGINS` environment variable
2. Splits it by commas to create an array of allowed origins
3. Falls back to default values if the environment variable is not set
4. Configures the CORS middleware to allow requests only from these origins

### Best Practices
1. Always include your local development URLs in the allowed origins during development
2. Update the allowed origins when deploying to production
3. Use environment variables for configuration to avoid hardcoding values
4. Be specific about which origins are allowed to enhance security
5. Include proper error handling for CORS-related issues 