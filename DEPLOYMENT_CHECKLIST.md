# Teams AI Foundry Bot - Deployment Checklist

## Pre-Deployment Requirements

### Azure Resources
- [ ] **Azure subscription** with appropriate permissions
- [ ] **Resource Group** created for the bot
- [ ] **Azure AI Foundry** service deployed and configured
- [ ] **Azure Cognitive Services Speech** service created
- [ ] **Azure Key Vault** provisioned (optional, created by ARM template)

### Azure AD App Registration
- [ ] **Azure AD App** registered for the bot
- [ ] **Application ID** (Client ID) noted
- [ ] **Authentication method** chosen:
  - [ ] **Client Secret** configured (for development/testing)
  - [ ] **Certificate** configured (for production - see CERTIFICATE_SETUP.md)
- [ ] **Redirect URIs** configured if needed
- [ ] **API Permissions** granted:
  - Microsoft Graph: `OnlineMeetings.ReadWrite`
  - Microsoft Graph: `Calls.AccessMedia.All`
  - Microsoft Graph: `User.Read`

### Certificate Authentication Setup (Optional but Recommended)
- [ ] **Certificate creation method** chosen:
  - [ ] **Automated**: Run `node deployment/create-certificate.js`
  - [ ] **Manual**: Create certificate in Azure Portal
  - [ ] **External CA**: Import certificate from trusted authority
- [ ] **Environment variables** configured for certificate auth:
  - [ ] `USE_CERTIFICATE_AUTH=true`
  - [ ] `AZURE_KEY_VAULT_CERTIFICATE_NAME` set
- [ ] **Certificate permissions** verified in Key Vault

### Environment Configuration
- [ ] **Environment variables** configured in `.env` file
- [ ] **AI Foundry endpoint** and API key available
- [ ] **Speech service** key and region configured
- [ ] **Bot credentials** (App ID, Secret/Certificate) available

## Deployment Steps

### 1. Code Deployment
- [ ] **Clone repository** to deployment environment
- [ ] **Install dependencies**: `npm install`
- [ ] **Run tests**: `npm test`
- [ ] **Configure environment**: Copy `.env.example` to `.env` and fill in values

### 2. Azure Resource Deployment
- [ ] **Generate deployment artifacts**: `node deployment/deploy.js`
- [ ] **Review ARM template**: Check `deployment/arm-template.json`
- [ ] **Deploy to Azure**: Run `./deploy.sh` or `./deploy.ps1`
- [ ] **Verify resources**: Check Azure portal for created resources
- [ ] **Note outputs**: Save deployment outputs (endpoints, resource names)

### 3. Bot Service Configuration
- [ ] **Web App deployment**: Deploy code to created Azure Web App
- [ ] **App Settings**: Verify environment variables in Web App configuration
- [ ] **Managed Identity**: Confirm identity is assigned and has proper permissions
- [ ] **Key Vault access**: Verify Web App can access Key Vault
- [ ] **Health check**: Test `/health` endpoint

### 4. Teams App Configuration
- [ ] **Teams manifest**: Use generated `deployment/manifest-generated.json`
- [ ] **App icons**: Add required icons to Teams app package
- [ ] **Create app package**: Zip manifest and icons
- [ ] **Upload to Teams**: Use Teams admin center or App Studio
- [ ] **Install app**: Install in target Teams environment

### 5. Testing and Validation

#### Basic Functionality
- [ ] **Bot responds** to direct messages
- [ ] **Health endpoints** return 200 OK
- [ ] **AI Foundry integration** works via `/api/ask`
- [ ] **Speech services** functional via `/api/text-to-speech`

#### Teams Integration
- [ ] **Teams chat** messages are processed
- [ ] **Meeting invitation** can be sent to bot
- [ ] **Meeting participation** works (if configured)
- [ ] **Voice transcription** functions in meetings

#### Security and Performance
- [ ] **Authentication** working with Managed Identity
- [ ] **Key Vault** secrets accessible
- [ ] **HTTPS** enforced on all endpoints
- [ ] **Logs** appearing in Application Insights
- [ ] **Response times** acceptable (<5 seconds for AI queries)

## Post-Deployment Configuration

### Monitoring Setup
- [ ] **Application Insights** alerts configured
- [ ] **Health monitoring** set up
- [ ] **Log retention** policies configured
- [ ] **Performance baselines** established

### Security Hardening
- [ ] **Network security** rules applied
- [ ] **Key rotation** schedule established
- [ ] **Access reviews** scheduled
- [ ] **Audit logging** enabled

### User Training
- [ ] **Documentation** updated for end users
- [ ] **Training materials** created
- [ ] **Support processes** established
- [ ] **Feedback collection** mechanism in place

## Troubleshooting Common Issues

### Bot Not Responding
1. **Check bot endpoint**: Verify `/health` returns 200
2. **Review logs**: Check Application Insights for errors
3. **Validate authentication**: Ensure bot app registration is correct
4. **Test connectivity**: Use `/api/test-ai-foundry` endpoint

### Speech Processing Issues
1. **Verify Speech service**: Check service key and region
2. **Test audio formats**: Ensure compatible audio input
3. **Check permissions**: Verify service access
4. **Review logs**: Look for Speech SDK errors

### AI Foundry Connection Problems
1. **Test endpoint**: Verify AI Foundry URL and key
2. **Check quotas**: Ensure service limits not exceeded
3. **Validate model**: Confirm deployment name is correct
4. **Review permissions**: Check AI Foundry access policies

### Teams Integration Issues
1. **Validate manifest**: Check Teams app manifest syntax
2. **Review permissions**: Ensure required permissions granted
3. **Check app installation**: Verify app installed correctly
4. **Test different contexts**: Try in chat, channel, and meeting

## Support and Maintenance

### Regular Tasks
- [ ] **Monitor performance**: Weekly performance reviews
- [ ] **Update dependencies**: Monthly package updates
- [ ] **Review logs**: Daily error log reviews
- [ ] **Test functionality**: Weekly smoke tests

### Emergency Procedures
- [ ] **Incident response**: Contact information and escalation paths
- [ ] **Rollback plan**: Documented rollback procedures
- [ ] **Backup verification**: Regular backup testing
- [ ] **Disaster recovery**: DR procedures documented and tested

---

**Deployment Date:** ___________
**Deployed By:** ___________
**Environment:** ___________
**Version:** ___________
