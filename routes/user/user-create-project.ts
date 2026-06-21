import { Router } from "express"
import { VerifyToken } from "../../lib/JWT-generate.js"
import { prisma } from "../../lib/prisma.js"
const router = Router()

router.post('/', async (req, res) => {
    const { token, project_name, api_sec, webcall_back, project_discription, expiresDate, paymentReceiverName } = req.body
    if (token == " " || project_name == "" || api_sec == "" || webcall_back == "" || project_discription == "" || paymentReceiverName == "") {
        return res.json({
            message: "Please fil credentials!!"
        })
    } else {
        const DecodeAccessToken = VerifyToken(token)
        if (DecodeAccessToken.status == 200) {
            const UserEmail = DecodeAccessToken.message.email
            const CreateProject = await prisma.projects.create({
                data: {
                    project_name: project_name,
                    api_sec_key: api_sec,
                    call_back_url: webcall_back,
                    project_description: project_discription,
                    ProjectBalance: "0.00 ETB",
                    before_expires: expiresDate,
                    receiver_name: paymentReceiverName,
                    user: {
                        connect: {
                            id: DecodeAccessToken.message.id,
                        },
                    },
                },
            })
            return res.status(200).json({
                status: 200,
                message: "Project created successfully"
            })
        } else {
            return res.status(400).json({
                status: 400,
                message: "Can't Create Project"
            })
        }
    }

})

export default router

