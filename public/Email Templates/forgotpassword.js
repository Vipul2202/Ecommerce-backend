exports.getForgotPasswordEmail = (username, resetLink) => {
  return `
    <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 30px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <tr>
          <td style="padding: 20px 30px; background-color: #007BFF; color: #ffffff;">
            <h1 style="margin: 0; font-size: 24px;">Password Reset Request</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 30px;">
            <p style="font-size: 16px; color: #333;">Hello <strong>${username}</strong>,</p>
            <p style="font-size: 15px; color: #555;">
              We received a request to reset your password. Click the button below to set a new password. This link will expire in 30 minutes.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #007BFF; color: #ffffff; padding: 12px 24px; font-size: 16px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Your Password
              </a>
            </div>
            <p style="font-size: 14px; color: #999;">If you didn't request this, you can safely ignore this email.</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 20px 30px; background-color: #f0f0f0; text-align: center; color: #666; font-size: 13px;">
            &copy; ${new Date().getFullYear()} Your App. All rights reserved.
          </td>
        </tr>
      </table>
    </div>
  `;
};
exports.getOtpEmail = (username, otp) => {
  return `
    <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 30px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <tr>
          <td style="padding: 20px 30px; background-color: #28a745; color: #ffffff;">
            <h1 style="margin: 0; font-size: 24px;">Your One-Time Password (OTP)</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 30px;">
            <p style="font-size: 16px; color: #333;">Hello <strong>${username}</strong>,</p>
            <p style="font-size: 15px; color: #555;">
              Your OTP for verification is:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #28a745; color: #ffffff; padding: 14px 28px; font-size: 22px; border-radius: 5px; display: inline-block; letter-spacing: 3px;">
                ${otp}
              </div>
            </div>
            <p style="font-size: 14px; color: #999;">This OTP is valid for 10 minutes. If you didn’t request this, please ignore this email.</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 20px 30px; background-color: #f0f0f0; text-align: center; color: #666; font-size: 13px;">
            &copy; ${new Date().getFullYear()} Your App. All rights reserved.
          </td>
        </tr>
      </table>
    </div>
  `;
};
exports.getWelcomeEmail = (username, email, password) => {
  return `
    <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 30px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <tr>
          <td style="padding: 20px 30px; background-color: #007bff; color: #ffffff;">
            <h1 style="margin: 0; font-size: 24px;">Welcome to Our App!</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 30px;">
            <p style="font-size: 16px; color: #333;">Hi <strong>${username}</strong>,</p>
            <p style="font-size: 15px; color: #555;">
              Thank you for registering. Below are your login credentials:
            </p>
            <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #007bff;">
              <p style="margin: 0; font-size: 15px;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 5px 0 0 0; font-size: 15px;"><strong>Password:</strong> ${password}</p>
            </div>
            <p style="font-size: 14px; color: #999;">Please keep this information safe. You can change your password anytime from your account settings.</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 20px 30px; background-color: #f0f0f0; text-align: center; color: #666; font-size: 13px;">
            &copy; ${new Date().getFullYear()} CarSaloon. All rights reserved.
          </td>
        </tr>
      </table>
    </div>
  `;
};
exports.getBookingConfirmationEmail = (username, confirmationLink) => {
  const isConfirmed = !confirmationLink;
  const title = isConfirmed ? "Car Saloon" : "Car Saloon - Booking Confirmation";
  const backgroundColor = isConfirmed ? "#007bff" : "#007bff";

  let content = '';
  if (isConfirmed) {
    content = `
      <p style="font-size: 16px; color: #333;">Hello <strong>${username}</strong>,</p>
      <p style="font-size: 15px; color: #555;">
        Great news! Your booking has been confirmed by our team. We look forward to serving you.
      </p>
      <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #8fc0f5ff; border-radius: 8px;">
        <h3 style="color: #007bff; margin: 0;">Your booking is confirmed!</h3>
        <p style="margin: 10px 0 0 0; color: #555;">We'll see you soon!</p>
      </div>
    `;
  } else {
    content = `
      <p style="font-size: 16px; color: #333;">Hello <strong>${username}</strong>,</p>
      <p style="font-size: 15px; color: #555;">
        Your booking has been created successfully! Please confirm your booking by clicking the button below.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${confirmationLink}" style="background-color: #007bff; color: #ffffff; padding: 12px 24px; font-size: 16px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Confirm Your Booking
        </a>
      </div>
      <p style="font-size: 14px; color: #999;">If you didn't make this booking, you can safely ignore this email.</p>
    `;
  }

  return `
    <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 30px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <tr>
          <td style="padding: 20px 30px; background-color: ${backgroundColor}; color: #ffffff;">
            <h1 style="margin: 0; font-size: 24px;">${title}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 30px;">
            ${content}
          </td>
        </tr>
        <tr>
          <td style="padding: 20px 30px; background-color: #f0f0f0; text-align: center; color: #666; font-size: 13px;">
            &copy; ${new Date().getFullYear()} CarSaloon. All rights reserved.
          </td>
        </tr>
      </table>
    </div>
  `;
};
exports.getBookingApprovalEmail = (booking) => {
  const {
    booking_id,
    location,
    vehicle_registration,
    services,
    booking_date,
    booking_time,
    first_name,
    
    email,
    phone,
    booking_status,
    
  } = booking;
 const formatDate = (date) => {
  if (!(date instanceof Date)) return date;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
};

  return `
    <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 30px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <tr>
          <td style="padding: 20px 30px; background-color: #007bff; color: #ffffff;">
            <h1 style="margin: 0; font-size: 24px;">Booking Approved</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 30px;">
            <p style="font-size: 16px; color: #333;">Hello <strong>${first_name}</strong>,</p>
            <p style="font-size: 15px; color: #555;">
              We are pleased to inform you that your booking has been <strong>approved</strong>. Below are your booking details:
            </p>
            <table style="font-size: 15px; color: #333; margin-top: 20px;">
              
              <tr><td><strong>Booking Location:</strong></td><td><b>${location}</b></td></tr>
              <tr><td><strong>Vehicle Registration:</strong></td><td>${vehicle_registration}</td></tr>
              <tr><td><strong>Services:</strong></td><td>${services && Array.isArray(services) ? services.join(', ') : services || 'N/A'}</td></tr>
              <tr><td><strong>Booking Date:</strong></td><td>${formatDate(booking_date)}</td></tr>
              
              <tr><td><strong>Booking Time:</strong></td><td>${booking_time}</td></tr>
              <tr><td><strong>Email:</strong></td><td>${email}</td></tr>
              <tr><td><strong>Phone:</strong></td><td>${phone}</td></tr>
              <tr><td><strong>Status:</strong></td><td style="color: green;"><strong>${booking_status}</strong></td></tr>
             
            </table>
            <p style="margin-top: 30px; font-size: 14px; color: #777;">
              <b>Note</b> - Heavily soiled vehicles(mud,sand,pet hair,stains,rubbish or biohazards) will incur an additional <b style="color: green;>surcharge</b> depending on the condition.
              We will advise you of any additional cost before we start the cleaning.

            </p>
            <p style="margin-top: 30px; font-size: 14px; color: #777;">
              If you have any questions or need to make changes to your booking, feel free to contact us.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 20px 30px; background-color: #f0f0f0; text-align: center; color: #666; font-size: 13px;">
            &copy; ${new Date().getFullYear()} CarSaloon. All rights reserved.
          </td>
        </tr>
      </table>
    </div>
  `;
};
exports.getBookingCancellationEmail = (booking) => {
  const {
    booking_id,
    car_type,
    location,
    vehicle_registration,
    services,
    booking_date,
    booking_time,
    first_name,
    last_name,
    email,
    phone,
    booking_status,
    booking_cancel_reason
  } = booking;

  return `
    <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 30px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <tr>
          <td style="padding: 20px 30px; background-color: #dc3545; color: #ffffff;">
            <h1 style="margin: 0; font-size: 24px;">Booking Cancelled</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 30px;">
            <p style="font-size: 16px; color: #333;">Hello <strong>${first_name} ${last_name}</strong>,</p>
            <p style="font-size: 15px; color: #555;">
              We regret to inform you that your booking has been <strong>cancelled</strong>. Please find the booking details below:
            </p>
            <table style="font-size: 15px; color: #333; margin-top: 20px;">
              <tr><td><strong>Booking Location:</strong></td><td><b>${location}</b></td></tr>
              <tr><td><strong>Car Type:</strong></td><td>${car_type}</td></tr>
              <tr><td><strong>Vehicle Registration:</strong></td><td>${vehicle_registration}</td></tr>
              <tr><td><strong>Services:</strong></td><td>${services && Array.isArray(services) ? services.join(', ') : services || 'N/A'}</td></tr>
              <tr><td><strong>Booking Date:</strong></td><td>${booking_date instanceof Date ? booking_date.toLocaleDateString() : booking_date}</td></tr>
              
              <tr><td><strong>Booking Time:</strong></td><td>${booking_time}</td></tr>
              <tr><td><strong>Email:</strong></td><td>${email}</td></tr>
              <tr><td><strong>Phone:</strong></td><td>${phone}</td></tr>
              <tr><td><strong>Status:</strong></td><td style="color: red;"><strong>${booking_status}</strong></td></tr>
              <tr><td><strong>Cancellation Reason:</strong></td><td>${booking_cancel_reason || 'Not specified'}</td></tr>
            </table>
            <p style="margin-top: 30px; font-size: 14px; color: #777;">
              If this was unexpected or if you have any questions, please contact our support team.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 20px 30px; background-color: #f0f0f0; text-align: center; color: #666; font-size: 13px;">
            &copy; ${new Date().getFullYear()} CarSaloon. All rights reserved.
          </td>
        </tr>
      </table>
    </div>
  `;
};
exports.getAdminNewBookingEmail = (booking) => {
  const {
    booking_id,
    location,
    vehicle_registration,
    services,
    booking_date,
    booking_time,
    first_name,

    email,
    phone,
    booking_status,
    link,
  } = booking;
 const formatDate = (date) => {
  if (!(date instanceof Date)) return date;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
};

  const isApproved = booking_status === 'approved';
  const title = isApproved ? "Booking Confirmed" : "New Booking Received";
  const statusColor = isApproved ? "#28a745" : "#ffc107"; // Green for approved, Yellow for pending
  const actionButton = isApproved ? '' : `
            <div style="margin-top: 40px; text-align: center;">
              <a href="${link}" style="background-color: #28a745; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Confirm Booking
              </a>
            </div>`;

  return `
    <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 30px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <tr>
          <td style="padding: 20px 30px; background-color: #17a2b8; color: #ffffff;">
            <h1 style="margin: 0; font-size: 24px;">${title}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 30px;">
            <p style="font-size: 16px; color: #333;">Hello Admin,</p>
            <p style="font-size: 15px; color: #555;">
              ${isApproved ? 'The following booking has been confirmed:' : 'A new booking has been submitted with the following details:'}
            </p>
            <table style="font-size: 15px; color: #333; margin-top: 20px;">
             
             <tr><td><strong>Booking Location :</strong></td><td>${location}</td></tr>
              <tr><td><strong>Vehicle Registration:</strong></td><td>${vehicle_registration}</td></tr>
              <tr><td><strong>Services:</strong></td><td>${services && Array.isArray(services) ? services.join(', ') : services || 'N/A'}</td></tr>
              <tr><td><strong>Booking Date:</strong></td><td>${formatDate(booking_date)}</td></tr>
            
              <tr><td><strong>Booking Time:</strong></td><td>${booking_time}</td></tr>
              <tr><td><strong>Customer Name:</strong></td><td>${first_name} </td></tr>
              <tr><td><strong>Email:</strong></td><td>${email}</td></tr>
              <tr><td><strong>Phone:</strong></td><td>${phone}</td></tr>
              <tr><td><strong>Status:</strong></td><td><strong style="color: ${statusColor};">${booking_status}</strong></td></tr>
            </table>

            ${actionButton}

            <p style="margin-top: 30px; font-size: 14px; color: #777;">
              <b>Note</b> - Heavily soiled vehicles(mud,sand,pet hair,stains,rubbish or biohazards) will incur an additional <b style="color: green;>surcharge</b> depending on the condition.
              We will advise you of any additional cost before we start the cleaning.

            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 20px 30px; background-color: #f0f0f0; text-align: center; color: #666; font-size: 13px;">
            &copy; ${new Date().getFullYear()} CarSaloon. All rights reserved.
          </td>
        </tr>
      </table>
    </div>
  `;
};

exports.getAdminNewPurchaseOrderEmail = (order) => {
  const {
    _id,
    userDetails,
    items,
    totalAmount,
    shippingAddress,
    shippingStatus,
    paidAt,
    deliveredAt,
    createdAt,
  } = order;

  const formattedItems = items
    .map(
      (item, index) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">
            <img src="${item.product.image}" alt="${item.product.name}" width="50" style="margin-right: 10px; vertical-align: middle;" />
            ${item.product.name}<br/>
            <small style="color: #888;">Category: ${item.product.category.name}</small>
          </td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₹${item.product.price.toFixed(2)}</td>
        </tr>
      `
    )
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 30px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 700px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <tr>
          <td style="padding: 20px 30px; background-color: #007bff; color: #ffffff;">
            <h1 style="margin: 0; font-size: 22px;">New Purchase Order Received</h1>
          </td>
        </tr>

        <tr>
          <td style="padding: 30px;">
            <p style="font-size: 16px; color: #333;">Hello Admin,</p>
            <p style="font-size: 15px; color: #555;">
              A new purchase order has been submitted with the following details:
            </p>

            <table style="font-size: 15px; color: #333; margin-top: 20px;">
              <tr><td><strong>Order ID:</strong></td><td>${_id}</td></tr>
              <tr><td><strong>Customer Name:</strong></td><td>${userDetails.name || 'N/A'}</td></tr>
              <tr><td><strong>Customer Email:</strong></td><td>${userDetails.email || 'N/A'}</td></tr>
              <tr><td><strong>Order Date:</strong></td><td>${new Date(createdAt).toLocaleDateString()}</td></tr>
              <tr><td><strong>Shipping Status:</strong></td><td><strong style="color: #ffc107;">${shippingStatus}</strong></td></tr>
            </table>

            <h3 style="margin-top: 30px; font-size: 18px;">Shipping Address</h3>
            <p style="font-size: 14px; color: #444;">
              ${shippingAddress.fullName},<br/>
              ${shippingAddress.address}, ${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.postalCode},<br/>
              ${shippingAddress.country}<br/>
              Phone: ${shippingAddress.phone}
            </p>

            <h3 style="margin-top: 30px; font-size: 18px;">Order Items</h3>
            <table width="100%" style="border-collapse: collapse; margin-top: 10px;">
              <thead>
                <tr style="background-color: #f8f9fa;">
                  <th style="padding: 8px; border: 1px solid #ddd;">#</th>
                  <th style="padding: 8px; border: 1px solid #ddd;">Product</th>
                  <th style="padding: 8px; border: 1px solid #ddd;">Qty</th>
                  <th style="padding: 8px; border: 1px solid #ddd;">Unit Price</th>
                </tr>
              </thead>
              <tbody>
                ${formattedItems}
              </tbody>
            </table>

            <h3 style="margin-top: 30px; font-size: 18px; text-align: right;">
              Total: ₹${totalAmount.toFixed(2)}
            </h3>

            <p style="margin-top: 30px; font-size: 14px; color: #777;">
              Please process this order in your admin dashboard.
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding: 20px 30px; background-color: #f0f0f0; text-align: center; color: #666; font-size: 13px;">
            &copy; ${new Date().getFullYear()} Your App. All rights reserved.
          </td>
        </tr>
      </table>
    </div>
  `;
};








