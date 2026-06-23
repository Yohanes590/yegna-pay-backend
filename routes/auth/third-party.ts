import { Router } from "express"
import { JWT, OAuth2Client } from 'google-auth-library';
import { ErrorPage } from "../../service/error-page-display.js";
import * as dotenv from "dotenv"
dotenv.config()
const router = Router()
const clientSide = new OAuth2Client(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    'https://yegna-pay-api.vercel.app/auth/third-party'
)

router.post('/', (req, res) => {
    if (req.body.data == "google") {
        const RedirectURL = clientSide.generateAuthUrl({
            access_type: "offline",
            scope: ['https://www.googleapis.com/auth/userinfo.profile',
                'https://www.googleapis.com/auth/userinfo.email']
        })
        return res.status(200).json({
            status: 200,
            url: RedirectURL
        })
    } else if (req.body.data == "github") {
        return res.status(200).json({
            status: 200,
            url: "https://github.com/login/oauth/authorize" +
                `?client_id=${process.env.GITHUB_CLIENT_ID}` +
                "&scope=read:user user:email"
        })
    } else {
        return res.status(400).send(ErrorPage)
    }
})

export default router
// djiaosdasdiansda;isda;sid